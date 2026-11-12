// guards/ldap-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '@/logs/logs.service';

type AuthRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  body?: { username?: string };
  ip?: string;
  socket?: { localAddress?: string };
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
    err: { message?: string } | null,
    user: TUser,
    info: PassportError | null,
    context: ExecutionContext,
  ): TUser {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const requestIp =
      typeof req.headers['x-real-ip'] === 'string'
        ? req.headers['x-real-ip']
        : req.ip;

    if (err || !user) {
      this.logsService
        .log({
          action: 'LOGIN_FAILED',
          service: 'auth',
          description: `${req.method ?? 'POST'} ${req.url ?? '/api/auth/ldap/login'}`,
          ip: requestIp,
          destinationIp: req.socket?.localAddress,
          username: req.body?.username,
          meta: {
            result: 'FAIL',
            userAgent: req.headers['user-agent'],
            reason: info?.message || err?.message,
          },
        })
        .catch(() => {});

      if (err instanceof Error) {
        throw err;
      }

      throw new UnauthorizedException(err?.message);
    }

    return user;
  }
}
