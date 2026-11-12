// strategies/local.strategy.ts
import { LogsService } from '@/logs/logs.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  ip?: string;
  socket?: { localAddress?: string };
};

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private logsService: LogsService,
  ) {
    super({ passReqToCallback: true });
  }

  private getRequestIp(req: RequestWithHeaders): string | undefined {
    const realIp = req.headers['x-real-ip'];
    return typeof realIp === 'string' ? realIp : req.ip;
  }

  async validate(req: RequestWithHeaders, username: string, password: string) {
    const user = await this.authService.validateLocalUser(username, password);

    if (!user) {
      await this.logsService.log({
        action: 'LOGIN_FAILED',
        service: 'auth',
        description: 'Local authentication',
        ip: this.getRequestIp(req),
        destinationIp: req.socket?.localAddress,
        username,
        meta: {
          result: 'FAIL',
          userAgent: req.headers['user-agent'],
        },
      });

      throw new UnauthorizedException();
    }

    await this.logsService.log({
      action: 'LOGIN',
      service: 'auth',
      description: 'Local authentication',
      ip: this.getRequestIp(req),
      destinationIp: req.socket?.localAddress,
      userId: user.id,
      username: user.username,
      meta: {
        result: 'SUCCESS',
        userAgent: req.headers['user-agent'],
      },
    });

    return user;
  }
}
