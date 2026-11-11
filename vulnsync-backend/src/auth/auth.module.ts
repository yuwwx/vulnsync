// auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionRefreshInterceptor } from './session-refresh.interceptor';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LdapAuthStrategy } from './strategies/ldap.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule.register({}),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // Короткий access: продлевается, пока пользователь активен.
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    LdapAuthStrategy,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionRefreshInterceptor,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
