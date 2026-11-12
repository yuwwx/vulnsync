// roles.guard.ts
import { LogsService } from '@/logs/logs.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { GuardedRequest, logAccessDenied } from './log-access-denied';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logsService: LogsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest<GuardedRequest>();
    const user = req.user;

    if (user?.role && requiredRoles.includes(user.role)) {
      return true;
    }

    logAccessDenied(this.logsService, req, {
      status: 403,
      user,
      requiredRoles,
    });

    return false;
  }
}
