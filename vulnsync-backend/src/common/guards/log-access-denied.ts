import { LogsService } from '@/logs/logs.service';
import type { Request } from 'express';

type AuthedUser = { id?: string; username?: string; role?: string };

export type GuardedRequest = Request & { user?: AuthedUser };

type AccessDeniedDetails = {
  status: 401 | 403;
  user?: AuthedUser;
  reason?: string;
  requiredRoles?: string[];
};

// Guard'ы выполняются до интерсептора, поэтому отказы 401/403
// журналируются здесь в едином формате.
export function logAccessDenied(
  logsService: LogsService,
  req: GuardedRequest,
  details: AccessDeniedDetails,
) {
  const realIp = req.headers['x-real-ip'];
  const ip = typeof realIp === 'string' ? realIp : req.ip;

  logsService
    .log({
      action: 'ACCESS_DENIED',
      service: 'auth',
      description: `${req.method} ${req.originalUrl ?? req.url}`,
      ip,
      destinationIp: req.socket?.localAddress,
      userId: details.user?.id,
      username: details.user?.username,
      meta: {
        result: 'FAIL',
        status: details.status,
        role: details.user?.role,
        requiredRoles: details.requiredRoles,
        reason: details.reason,
        userAgent: req.headers['user-agent'],
      },
    })
    .catch(() => {});
}
