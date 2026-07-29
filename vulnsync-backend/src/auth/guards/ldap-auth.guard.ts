// guards/ldap-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '@/logs/logs.service';

type AuthRequest = {
  headers: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  body?: { username?: string };
  ip?: string;
};

type PassportError = {
  message?: string;
};

@Injectable()
export class LdapAuthGuard extends AuthGuard('ldap') {
  constructor(private readonly logsService: LogsService) {
    super();
  }

  handleRequest<TUser = unknown>(
    err: PassportError | null,
    user: TUser,
    info: PassportError | null,
    context: ExecutionContext,
    status?: number,
  ): TUser {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const requestIp =
      typeof req.headers['x-real-ip'] === 'string'
        ? req.headers['x-real-ip']
        : req.ip;

    if (err || !user) {
      this.logsService
        .log('LOGIN_FAILED', requestIp, undefined, {
          result: 'FAIL',
          username: req.body?.username,
          userAgent: req.headers['user-agent'],
          reason: info?.message || err?.message,
        })
        .catch(() => {});

      throw err || new UnauthorizedException();
    }

    return user;
  }
}
