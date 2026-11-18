// roles.guard.ts
import { PrismaService } from '@/prisma/prisma.service';
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
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest<GuardedRequest>();
    const user = req.user;

    // Роль читаем из БД, а не из JWT: понижение или удаление пользователя
    // применяется сразу, а не по истечении access-токена.
    const dbUser = user?.id
      ? await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        })
      : null;

    if (dbUser?.role && requiredRoles.includes(dbUser.role)) {
      // Держим роль в запросе синхронной с БД для последующих обработчиков.
      if (req.user) {
        req.user.role = dbUser.role;
      }
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
