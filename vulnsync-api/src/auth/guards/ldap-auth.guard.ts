// guards/ldap-auth.guard.ts
import { AuthGuard } from '@nestjs/passport';
export class LdapAuthGuard extends AuthGuard('ldap') {}
