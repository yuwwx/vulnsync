// strategies/ldap.strategy.ts
import { LogsService } from '@/logs/logs.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import LdapStrategy from 'passport-ldapauth';
import { AuthService } from '../auth.service';

type LdapRequest = {
  headers: Record<string, string | string[] | undefined> & {
    'x-real-ip'?: string;
    'user-agent'?: string;
  };
  ip?: string;
};

type LdapUser = {
  memberOf?: string | string[];
  id?: string;
  sAMAccountName: string;
  dn: string;
  mail: string;
  displayName: string;
  title: string;
};

@Injectable()
export class LdapAuthStrategy extends PassportStrategy(LdapStrategy, 'ldap') {
  private readonly userGroupDn?: string;
  private readonly viewerGroupDn?: string;
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
    this.viewerGroupDn = config.get<string>('LDAP_VIEWER_GROUP_DN');
    this.adminGroupDn = config.get<string>('LDAP_ADMIN_GROUP_DN');
  }

  async validate(req: LdapRequest, user: LdapUser | undefined) {
    const requestIp =
      typeof req.headers['x-real-ip'] === 'string'
        ? req.headers['x-real-ip']
        : req.ip;
    if (!user) {
      await this.logsService.log('LOGIN_FAILED', requestIp, undefined, {
        username: undefined,
        userAgent: req.headers['user-agent'],
      });

      throw new UnauthorizedException();
    }

    const memberOf = user.memberOf || [];

    let assignedRole: 'USER' | 'VIEWER' | 'ADMIN' = 'USER'; // по умолчанию

    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];

    if (this.adminGroupDn && groups.includes(this.adminGroupDn)) {
      assignedRole = 'ADMIN';
    } else if (this.viewerGroupDn && groups.includes(this.viewerGroupDn)) {
      assignedRole = 'VIEWER';
    } else if (this.userGroupDn && groups.includes(this.userGroupDn)) {
      assignedRole = 'USER';
    } else {
      await this.logsService.log('LOGIN_FAILED', requestIp, user.id, {
        result: 'FAIL',
        username: user.sAMAccountName,
        userAgent: req.headers['user-agent'],
      });
      throw new UnauthorizedException('User not in allowed LDAP groups');
    }

    await this.logsService.log('LOGIN', requestIp, user.id, {
      result: 'SUCCESS',
      username: user.sAMAccountName,
      userAgent: req.headers['user-agent'],
      assignedRole,
    });

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
