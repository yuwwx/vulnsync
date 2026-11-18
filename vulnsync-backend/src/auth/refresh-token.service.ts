// refresh-token.service.ts
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { refreshTokenTtlMs } from './auth-cookie';

export type RefreshMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export type IssuedRefreshToken = {
  token: string;
  expiresAt: Date;
};

export type RotateResult =
  | { ok: true; userId: string; token: string; expiresAt: Date }
  | { ok: false; reason: 'missing' | 'expired' | 'reused' };

type RevokedTokenRow = {
  userId: string;
  familyId: string;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
};

// Окно, в котором повтор уже отозванного токена считается гонкой вкладок,
// а не признаком кражи.
const REUSE_GRACE_MS = 30_000;

// Сколько хранить отозванные токены (для аудита) перед удалением.
const REVOKED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Выдаёт новый refresh-токен; в БД хранится только его хэш.
  async issue(
    userId: string,
    meta: RefreshMeta = {},
    familyId?: string,
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + refreshTokenTtlMs(this.config));

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(token),
        userId,
        familyId: familyId ?? randomUUID(),
        expiresAt,
        createdByIp: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { token, expiresAt };
  }

  // Ротация: старый токен отзывается, выдаётся новый. «Забираем» старый токен
  // атомарно (updateMany с условием revokedAt=null), чтобы параллельные
  // запросы не выдали два валидных токена. Повтор уже отозванного токена вне
  // короткого окна (гонки вкладок) трактуется как кража — отзываем семейство.
  async rotate(raw: string, meta: RefreshMeta = {}): Promise<RotateResult> {
    const tokenHash = this.hash(raw);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      return { ok: false, reason: 'missing' };
    }

    if (existing.revokedAt) {
      return this.handleRevoked(existing, meta);
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + refreshTokenTtlMs(this.config));

    const claimed = await this.prisma.$transaction(async (tx) => {
      const claimedRows = await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date(), replacedByTokenHash: this.hash(token) },
      });

      if (claimedRows.count === 0) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          tokenHash: this.hash(token),
          userId: existing.userId,
          familyId: existing.familyId,
          expiresAt,
          createdByIp: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });

      return true;
    });

    if (!claimed) {
      // Токен ротировали параллельно — обрабатываем как повтор.
      const fresh = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      return this.handleRevoked(fresh ?? existing, meta);
    }

    return { ok: true, userId: existing.userId, token, expiresAt };
  }

  private async handleRevoked(
    existing: RevokedTokenRow,
    meta: RefreshMeta,
  ): Promise<RotateResult> {
    const sinceRevoked = existing.revokedAt
      ? Date.now() - existing.revokedAt.getTime()
      : Infinity;

    // Гонка нескольких вкладок: тот же refresh-токен уже ротирован секунды
    // назад. Не считаем кражей — выдаём ещё один токен в том же семействе.
    if (existing.replacedByTokenHash && sinceRevoked < REUSE_GRACE_MS) {
      const grace = await this.issue(existing.userId, meta, existing.familyId);

      return {
        ok: true,
        userId: existing.userId,
        token: grace.token,
        expiresAt: grace.expiresAt,
      };
    }

    await this.revokeFamily(existing.familyId);
    this.logger.warn(
      `Refresh token reuse detected: family=${existing.familyId} user=${existing.userId}`,
    );

    return { ok: false, reason: 'reused' };
  }

  // Отзыв конкретного токена (выход). Возвращает владельца, даже если токен
  // уже был отозван — это нужно для записи события в журнал.
  async revoke(raw: string): Promise<{ userId: string } | null> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
    });

    if (!existing) {
      return null;
    }

    if (!existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { tokenHash: existing.tokenHash },
        data: { revokedAt: new Date() },
      });
    }

    return { userId: existing.userId };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Гигиена БД: убираем просроченные токены и давно отозванные.
  // Свежие отозванные не трогаем — на них завязано окно гонки вкладок.
  @Cron(process.env.REFRESH_TOKEN_CLEANUP_CRON ?? '0 3 * * *')
  async cleanupExpired(): Promise<void> {
    const now = new Date();
    const revokedCutoff = new Date(now.getTime() - REVOKED_RETENTION_MS);

    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedCutoff } }],
      },
    });

    if (count > 0) {
      this.logger.log(`Removed ${count} stale refresh token(s)`);
    }
  }
}
