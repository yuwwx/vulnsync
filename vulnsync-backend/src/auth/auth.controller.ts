// auth.controller.ts
import { getDestinationIp, getSourceIp } from '@/common/network/request-ip';
import { Public } from '@/common/decorators/public.decorator';
import { LogsService } from '@/logs/logs.service';
import {
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

type AuthRequest = {
  user?: { id: string; username: string; role: string };
  headers?: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  ip?: string;
  socket?: { localAddress?: string };
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private logsService: LogsService,
  ) {}

  // Локальный вход - только для dev: включается AUTH_LOCAL_LOGIN=true.
  // На проме по умолчанию отключен (403).
  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  login(@Req() req: AuthRequest) {
    if (this.config.get<string>('AUTH_LOCAL_LOGIN') !== 'true') {
      throw new ForbiddenException('Local login is disabled');
    }
    return this.authService.login(req.user!);
  }

  @Post('ldap/login')
  @Public()
  @UseGuards(LdapAuthGuard)
  ldapLogin(@Req() req: AuthRequest) {
    return this.authService.login(req.user!);
  }

  // Выход журналируется отдельным событием: токен stateless, но факт
  // завершения сессии должен попасть в журнал кибербезопасности.
  @Post('logout')
  async logout(@Req() req: AuthRequest) {
    await this.logsService.log({
      action: 'LOGOUT',
      service: 'auth',
      description: 'POST /api/auth/logout',
      ip: getSourceIp(req),
      destinationIp: getDestinationIp(req),
      userId: req.user?.id,
      username: req.user?.username,
      meta: {
        result: 'SUCCESS',
        userAgent: req.headers?.['user-agent'],
      },
    });

    return { ok: true };
  }
}
