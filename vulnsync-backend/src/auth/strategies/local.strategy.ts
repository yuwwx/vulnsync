// strategies/local.strategy.ts
import { LogsService } from '@/logs/logs.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

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
      await this.logsService.log(
        'LOGIN_FAILED',
        req.headers['x-real-ip'] || req.ip,
        undefined,
        {
          result: 'FAIL',
          username: username,
          userAgent: req.headers['user-agent'],
        },
      );

      throw new UnauthorizedException();
    }

    await this.logsService.log(
      'LOGIN',
      req.headers['x-real-ip'] || req.ip,
      user.id,
      {
        result: 'SUCCESS',
        username: username,
        userAgent: req.headers['user-agent'],
      },
    );

    return user;
  }
}
