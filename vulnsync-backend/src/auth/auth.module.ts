// auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LdapAuthStrategy } from './strategies/ldap.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule.register({}),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // Короткий access-токен: сессию продлевает refresh-токен
        // (см. RefreshTokenService и POST /auth/refresh).
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_TTL') ??
            '2h') as JwtSignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    RefreshTokenService,
    LocalStrategy,
    LdapAuthStrategy,
    JwtStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
