// auth.controller.ts
import { Public } from '@/common/decorators/public.decorator';
import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  login(@Req() req) {
    return this.authService.login(req.user);
  }

  @Post('ldap/login')
  @Public()
  @UseGuards(LdapAuthGuard)
  ldapLogin(@Req() req) {
    return this.authService.login(req.user);
  }
}
