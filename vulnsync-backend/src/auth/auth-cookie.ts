// auth-cookie.ts
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

// Access-токен (JWT) и refresh-токен живут в HttpOnly-куках: браузер
// отправляет их сам, а продление/ротация приходят через Set-Cookie.
// Клиент токены не хранит и не подставляет вручную.
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const DEFAULT_REFRESH_TTL_HOURS = 24;

export function refreshTokenTtlMs(config: ConfigService): number {
  const hours = Number(config.get<string>('REFRESH_TOKEN_TTL_HOURS'));
  const ttlHours =
    Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_REFRESH_TTL_HOURS;

  return ttlHours * 60 * 60 * 1000;
}

// За nginx TLS терминируется, поэтому secure включаем только на проме.
const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
});

export function accessCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseOptions(),
    path: '/',
    maxAge: refreshTokenTtlMs(config),
  };
}

// Refresh-куку шлём только на /api/auth (refresh, logout) — уже, чем access.
export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseOptions(),
    path: '/api/auth',
    maxAge: refreshTokenTtlMs(config),
  };
}
