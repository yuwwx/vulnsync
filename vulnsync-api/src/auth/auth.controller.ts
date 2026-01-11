// auth.controller.ts
import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req) {
    return this.authService.login(req.user);
  }

  @Post('ldap/login')
  @UseGuards(LdapAuthGuard)
  ldapLogin(@Req() req) {
    return this.authService.login(req.user);
  }
}
