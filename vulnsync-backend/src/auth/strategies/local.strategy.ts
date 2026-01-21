// strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private logsService: LogsService,
  ) {
    super({ passReqToCallback: true });
  }

  async validate(req: any, username: string, password: string) {
    const user = await this.authService.validateLocalUser(username, password);

    if (!user) {
      await this.logsService.log('LOGIN_FAILED', req.ip, undefined, {
        username: undefined,
        userAgent: req.headers['user-agent'],
      });

      throw new UnauthorizedException();
    }

    await this.logsService.log('LOGIN', req.ip, user.id, {
      username: user.username,
      userAgent: req.headers['user-agent'],
    });

    return user;
  }
}
