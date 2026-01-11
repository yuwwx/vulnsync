// strategies/ldap.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import LdapStrategy from 'passport-ldapauth';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  constructor(
    private authService: AuthService,
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
      server: {
        url: LDAP_URL,
        bindDN: LDAP_BIND_DN,
        bindCredentials: LDAP_BIND_PASSWORD,
        searchBase: LDAP_SEARCH_BASE,
        searchFilter: '(sAMAccountName={{username}})',
      },
    });
  }

  async validate(user: any) {
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.authService.validateLdapUser(user.sAMAccountName, user.dn);
  }
}
