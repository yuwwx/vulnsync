// auth.controller.ts
import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { AuthService } from './auth.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  login(@Req() req) {
    return this.authService.login(req.user, req);
  }

  @Post('ldap/login')
  @Public()
  @UseGuards(LdapAuthGuard)
  ldapLogin(@Req() req) {
    return this.authService.login(req.user, req);
  }
}
