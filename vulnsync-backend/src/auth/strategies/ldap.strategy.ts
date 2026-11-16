// strategies/ldap.strategy.ts
import { getDestinationIp, getSourceIp } from '@/common/network/request-ip';
import { LogsService } from '@/logs/logs.service';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
  socket?: { localAddress?: string };
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
    const requestIp = getSourceIp(req);

    if (!user) {
      // Неуспешная аутентификация журналируется в LdapAuthGuard.
      throw new UnauthorizedException();
    }

    const memberOf = user.memberOf || [];

    // DN из AD сравниваем без учёта регистра и лишних пробелов.
    const normalizeDn = (dn: string) => dn.trim().toLowerCase();
    const groups = new Set(
      (Array.isArray(memberOf) ? memberOf : [memberOf]).map(normalizeDn),
    );

    // Явный приоритет: если пользователь в нескольких группах,
    // выбираем самую старшую роль.
    const roleByPriority: Array<{
      role: 'USER' | 'VIEWER' | 'ADMIN';
      groupDn?: string;
    }> = [
      { role: 'ADMIN', groupDn: this.adminGroupDn },
      { role: 'VIEWER', groupDn: this.viewerGroupDn },
      { role: 'USER', groupDn: this.userGroupDn },
    ];

    const matchedRole = roleByPriority.find(
      ({ groupDn }) => groupDn && groups.has(normalizeDn(groupDn)),
    );

    if (!matchedRole) {
      // Логин/пароль верны, но пользователь не в разрешённой группе —
      // это не ошибка аутентификации, а отсутствие прав.
      // Событие неуспеха запишет LdapAuthGuard.
      throw new ForbiddenException('Недостаточно прав для входа в приложение');
    }

    const assignedRole = matchedRole.role;

    const {
      user: dbUser,
      created,
      changed,
    } = await this.authService.validateLdapUser(
      user.sAMAccountName,
      user.dn,
      user.mail,
      user.displayName,
      user.title,
      assignedRole,
    );

    const common = {
      service: 'auth',
      ip: requestIp,
      destinationIp: getDestinationIp(req),
      userId: dbUser.id,
      username: dbUser.username,
      meta: {
        result: 'SUCCESS' as const,
        role: assignedRole,
        userAgent: req.headers['user-agent'],
      },
    };

    if (created) {
      await this.logsService.log({
        ...common,
        action: 'ACCOUNT_CREATE',
        description: `LDAP account created: ${user.sAMAccountName}`,
      });
    } else if (changed) {
      await this.logsService.log({
        ...common,
        action: 'ACCOUNT_UPDATE',
        description: `LDAP account updated: ${user.sAMAccountName}`,
      });
    }

    await this.logsService.log({
      ...common,
      action: 'LOGIN',
      description: 'LDAP authentication',
    });

    return dbUser;
  }
}
