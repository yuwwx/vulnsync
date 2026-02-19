// strategies/ldap.strategy.ts
import { LogsService } from '@/logs/logs.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import LdapStrategy from 'passport-ldapauth';
import { AuthService } from '../auth.service';

@Injectable()
export class LdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  private readonly userGroupDn?: string;
  private readonly adminGroupDn?: string;

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

    this.userGroupDn = config.get<string>('LDAP_USER_GROUP_DN');
    this.adminGroupDn = config.get<string>('LDAP_ADMIN_GROUP_DN');
  }

  async validate(req: any, user: any) {
    if (!user) {
      await this.logsService.log(
        'LOGIN_FAILED',
        req.headers['x-real-ip'] || req.ip,
        undefined,
        {
          username: undefined,
          userAgent: req.headers['user-agent'],
        },
      );

      throw new UnauthorizedException();
    }

    const memberOf = user.memberOf || [];

    let assignedRole: 'USER' | 'ADMIN' = 'USER'; // по умолчанию

    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];

    if (groups.includes(this.adminGroupDn)) {
      assignedRole = 'ADMIN';
    } else if (groups.includes(this.userGroupDn)) {
      assignedRole = 'USER';
    } else {
      await this.logsService.log(
        'LOGIN_FAILED',
        req.headers['x-real-ip'] || req.ip,
        user.id,
        {
          username: user.username,
          userAgent: req.headers['user-agent'],
        },
      );
      throw new UnauthorizedException('User not in allowed LDAP groups');
    }

    await this.logsService.log(
      'LOGIN',
      req.headers['x-real-ip'] || req.ip,
      user.id,
      {
        username: user.username,
        userAgent: req.headers['user-agent'],
        assignedRole,
      },
    );

    return this.authService.validateLdapUser(
      user.sAMAccountName,
      user.dn,
      user.mail,
      user.displayName,
      user.title,
      assignedRole,
    );
  }
}
