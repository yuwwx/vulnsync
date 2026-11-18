// auth.service.ts
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '../../prisma/generated/enums';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

type AuthenticatedUser = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
  jobTitle?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  login(user: AuthenticatedUser) {
    // Access-токен отдаём отдельно: контроллер кладёт его в HttpOnly-куку,
    // а в теле ответа уходят только данные профиля.
    return {
      accessToken: this.signAccessToken(user),
      profile: {
        username: user.username,
        email: user?.email,
        displayName: user?.displayName,
        jobTitle: user?.jobTitle,
        role: user.role,
      },
    };
  }

  signAccessToken(user: { id: string; username: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  // Данные пользователя для новой сессии (refresh): роль берём из БД,
  // чтобы изменения доступа применялись не позднее следующего обновления.
  async getSessionUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      jobTitle: user.jobTitle,
    };
  }

  async validateLocalUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) return null;

    const match = await bcrypt.compare(password, user.password);

    if (!match) return null;

    return user;
  }

  async validateLdapUser(
    username: string,
    ldapDn: string,
    email: string,
    displayName: string,
    jobTitle: string,
    role: Role = 'USER',
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { username },
    });

    const user = await this.prisma.user.upsert({
      where: { username },
      update: {
        ldapDn,
        email,
        displayName,
        jobTitle,
        role,
        updatedAt: new Date(),
      },
      create: {
        username,
        ldapDn,
        email,
        displayName,
        jobTitle,
        role,
      },
    });

    // Нужно для событий ACCOUNT_CREATE/ACCOUNT_UPDATE в журнале.
    const created = !existing;
    const changed =
      existing !== null &&
      (existing.role !== user.role ||
        existing.email !== user.email ||
        existing.displayName !== user.displayName ||
        existing.jobTitle !== user.jobTitle);

    return { user, created, changed };
  }
}
