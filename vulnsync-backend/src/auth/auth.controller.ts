// auth.controller.ts
import { Public } from '@/common/decorators/public.decorator';
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

type AuthRequest = { user: { id: string; username: string; role: string } };

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
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
    return this.authService.login(req.user);
  }

  @Post('ldap/login')
  @Public()
  @UseGuards(LdapAuthGuard)
  ldapLogin(@Req() req: AuthRequest) {
    return this.authService.login(req.user);
  }
}
