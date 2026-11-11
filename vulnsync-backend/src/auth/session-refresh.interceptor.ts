import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

// Скользящее продление access-токена: пока пользователь активен, обновляем
// токен заранее, но не дольше абсолютного времени сессии.
const RENEW_WHEN_LEFT_SECONDS = 10 * 60;
const ABSOLUTE_SESSION_SECONDS = 12 * 60 * 60;

export const REFRESHED_TOKEN_HEADER = 'X-Refreshed-Token';

type SessionUser = {
  id?: string;
  username?: string;
  role?: string;
  sessionStartedAt?: number;
  tokenExpiresAt?: number;
};

@Injectable()
export class SessionRefreshInterceptor implements NestInterceptor {
  constructor(private jwt: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: SessionUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;

    if (user?.id && user.tokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const sessionStartedAt = user.sessionStartedAt ?? now;
      const shouldRenew =
        user.tokenExpiresAt - now < RENEW_WHEN_LEFT_SECONDS &&
        now - sessionStartedAt < ABSOLUTE_SESSION_SECONDS;

      if (shouldRenew) {
        const token = this.jwt.sign({
          sub: user.id,
          username: user.username,
          role: user.role,
          sess: sessionStartedAt,
        });

        response.setHeader(REFRESHED_TOKEN_HEADER, token);
      }
    }

    return next.handle();
  }
}
