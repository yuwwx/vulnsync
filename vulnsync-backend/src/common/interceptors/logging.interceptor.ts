import { LogsService } from '@/logs/logs.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { catchError, Observable, tap } from 'rxjs';
import { LOG_ACTION_KEY } from '../decorators/logAction.decorator';
import { getDestinationIp, getSourceIp } from '../network/request-ip';

type AuthedUser = { id?: string; username?: string };

type LoggedRequest = Request & {
  user?: AuthedUser;
  socket?: { localAddress?: string };
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    private logsService: LogsService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<LoggedRequest>();
    // На @Public-роутах (логин, ручной запуск отчётов) req.user отсутствует
    const user = req.user;
    const ip = getSourceIp(req);
    const destinationIp = getDestinationIp(req);
    const description = `${req.method} ${req.originalUrl ?? req.url}`;
    // Источник события — контроллер (сервис/служба) без суффикса Controller
    const service = context.getClass().name.replace(/Controller$/, '');
    const action =
      this.reflector.get<string>(LOG_ACTION_KEY, context.getHandler()) ||
      description;

    // Запись в журнал не должна влиять на ответ запроса: в т.ч. на @Public-роутах,
    // где пользователя нет, и при недоступности БД (иначе процесс падает
    // из-за необработанного rejection внутри tap)
    const writeLog = (result: 'SUCCESS' | 'FAIL') => {
      this.logsService
        .log({
          action,
          service,
          description,
          ip,
          destinationIp,
          userId: user?.id,
          username: user?.username ?? 'anonymous',
          meta: {
            result,
            userAgent: req.headers['user-agent'],
          },
        })
        .catch((error: unknown) =>
          this.logger.error(
            `Failed to write action log: action=${action}`,
            error instanceof Error ? error.stack : String(error),
          ),
        );
    };

    return next.handle().pipe(
      tap(() => writeLog('SUCCESS')),
      catchError((err) => {
        writeLog('FAIL');
        throw err;
      }),
    );
  }
}
