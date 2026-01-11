// strategies/ldap.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import LdapStrategy from 'passport-ldapauth';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class LdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  constructor(
    private authService: AuthService,
    private logsService: LogsService,
    config: ConfigService,
  ) {
    const LDAP_URL = config.get<string>('LDAP_URL');
    const LDAP_BIND_DN = config.get<string>('LDAP_BIND_DN');
    const LDAP_BIND_PASSWORD = config.get<string>('LDAP_BIND_PASSWORD');
    const LDAP_SEARCH_BASE = config.get<string>('LDAP_SEARCH_BASE');

    if (
      !LDAP_URL ||
      !LDAP_BIND_DN ||
      !LDAP_BIND_PASSWORD ||
      !LDAP_SEARCH_BASE
    ) {
      throw new Error('LDAP environment variables are not set');
    }

    super({
      passReqToCallback: true,
      server: {
        url: LDAP_URL,
        bindDN: LDAP_BIND_DN,
        bindCredentials: LDAP_BIND_PASSWORD,
        searchBase: LDAP_SEARCH_BASE,
        searchFilter: '(sAMAccountName={{username}})',
      },
    });
  }

  async validate(req: any, user: any) {
    if (!user) {
      await this.logsService.log('LOGIN_FAILED', req.ip, undefined, {
        username: undefined,
        userAgent: req.headers['user-agent'],
      });

      throw new UnauthorizedException();
    }

    await this.logsService.log('LOGIN', req.ip, user.id, {
      username: user.username,
      userAgent: req.headers['user-agent'],
    });

    return this.authService.validateLdapUser(user.sAMAccountName, user.dn);
  }
}
