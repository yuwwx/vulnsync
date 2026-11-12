import { LogsService } from '@/logs/logs.service';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { GuardedRequest, logAccessDenied } from './log-access-denied';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private logsService: LogsService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string } | null,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<GuardedRequest>();

      logAccessDenied(this.logsService, req, {
        status: 401,
        user: req.user,
        reason: err instanceof Error ? err.message : info?.message,
      });

      if (err instanceof Error) {
        throw err;
      }

      throw new UnauthorizedException(info?.message);
    }

    return user;
  }
}
