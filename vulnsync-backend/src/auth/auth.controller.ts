// auth.controller.ts
import { getDestinationIp, getSourceIp } from '@/common/network/request-ip';
import { Public } from '@/common/decorators/public.decorator';
import { LogsService } from '@/logs/logs.service';
import {
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './auth-cookie';
import { AuthService } from './auth.service';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenService } from './refresh-token.service';

type AuthUser = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
  jobTitle?: string | null;
};

type AuthRequest = {
  user?: AuthUser;
  cookies?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  ip?: string;
  socket?: { localAddress?: string };
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private refreshTokenService: RefreshTokenService,
    private config: ConfigService,
    private logsService: LogsService,
  ) {}

  // Локальный вход - только для dev: включается AUTH_LOCAL_LOGIN=true.
  // На проме по умолчанию отключен (403).
  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  async login(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.config.get<string>('AUTH_LOCAL_LOGIN') !== 'true') {
      throw new ForbiddenException('Local login is disabled');
    }
    return this.issueSession(req.user!, req, res);
  }

  @Post('ldap/login')
  @Public()
  @UseGuards(LdapAuthGuard)
  async ldapLogin(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueSession(req.user!, req, res);
  }

  // Обновление сессии по refresh-токену: ротация refresh + новый access.
  @Post('refresh')
  @Public()
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      throw new UnauthorizedException('Нет refresh-токена');
    }

    const rotated = await this.refreshTokenService.rotate(
      raw,
      this.refreshMeta(req),
    );

    if (!rotated.ok) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Сессия истекла');
    }

    const user = await this.authService.getSessionUser(rotated.userId);
    if (!user) {
      // Пользователь удалён/отключён — гасим все его сессии.
      await this.refreshTokenService.revokeAllForUser(rotated.userId);
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Пользователь не найден');
    }

    return this.setSessionCookies(user, rotated.token, res);
  }

  // Выход: отзываем refresh-токен и чистим куки. Публичный, чтобы выход
  // сработал даже с истёкшим access-токеном.
  @Post('logout')
  @Public()
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    let userId: string | undefined;
    let username: string | undefined;

    if (raw) {
      const revoked = await this.refreshTokenService.revoke(raw);
      if (revoked) {
        const user = await this.authService.getSessionUser(revoked.userId);
        userId = user?.id ?? revoked.userId;
        username = user?.username;
      }
    }

    this.clearAuthCookies(res);

    await this.logsService.log({
      action: 'LOGOUT',
      service: 'auth',
      description: 'POST /api/auth/logout',
      ip: getSourceIp(req),
      destinationIp: getDestinationIp(req),
      userId,
      username,
      meta: {
        result: 'SUCCESS',
        userAgent: req.headers?.['user-agent'],
      },
    });

    return { ok: true };
  }

  // Новый вход: access-токен + новый refresh-токен (семейство ротаций).
  private async issueSession(user: AuthUser, req: AuthRequest, res: Response) {
    const refresh = await this.refreshTokenService.issue(
      user.id,
      this.refreshMeta(req),
    );

    return this.setSessionCookies(user, refresh.token, res);
  }

  private setSessionCookies(
    user: AuthUser,
    refreshToken: string,
    res: Response,
  ) {
    const { accessToken, profile } = this.authService.login(user);

    res.cookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      accessCookieOptions(this.config),
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      refreshCookieOptions(this.config),
    );

    return profile;
  }

  private readRefreshCookie(req: AuthRequest): string | null {
    const value = req.cookies?.[REFRESH_TOKEN_COOKIE];

    return typeof value === 'string' && value ? value : null;
  }

  private refreshMeta(req: AuthRequest) {
    return {
      ip: getSourceIp(req),
      userAgent: req.headers?.['user-agent'] ?? null,
    };
  }

  private clearAuthCookies(res: Response) {
    // maxAge убираем: иначе Express перезапишет expires и кука не удалится.
    const access = accessCookieOptions(this.config);
    const refresh = refreshCookieOptions(this.config);

    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...access, maxAge: undefined });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...refresh, maxAge: undefined });
  }
}
