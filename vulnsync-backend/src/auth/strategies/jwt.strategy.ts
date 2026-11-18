// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookie';

type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
};

// Токен берём из HttpOnly-куки; Bearer оставляем для Swagger/внешних клиентов.
const cookieExtractor = (req: Request): string | null => {
  // req.cookies появляется после cookie-parser (типизирован как any).
  const cookies = req.cookies as Record<string, string> | undefined;
  const token = cookies?.[ACCESS_TOKEN_COOKIE];

  return typeof token === 'string' && token ? token : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      // Фиксируем алгоритм, чтобы исключить подмену alg в токене.
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload) {
    // payload.sub содержит user.id
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
