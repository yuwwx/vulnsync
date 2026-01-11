// auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { LdapAuthStrategy } from './strategies/ldap.strategy';

@Module({
  imports: [PassportModule],
  providers: [AuthService, LocalStrategy, LdapAuthStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
