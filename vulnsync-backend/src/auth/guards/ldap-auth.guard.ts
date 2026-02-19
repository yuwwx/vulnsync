// guards/ldap-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class LdapAuthGuard extends AuthGuard('ldap') {
  constructor(private readonly logsService: LogsService) {
    super();
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    const req = context.switchToHttp().getRequest();

    if (err || !user) {
      this.logsService
        .log('LOGIN_FAILED', req.headers['x-real-ip'] || req.ip, undefined, {
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
