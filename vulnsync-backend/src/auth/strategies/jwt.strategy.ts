// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  sess?: number;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
      sessionStartedAt: payload.sess ?? payload.iat,
      tokenExpiresAt: payload.exp,
    };
  }
}
