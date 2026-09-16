import { LogsService } from '@/logs/logs.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, Observable, tap } from 'rxjs';
import { LOG_ACTION_KEY } from '../decorators/logAction.decorator';

type AuthedUser = { id: string; username: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    private logsService: LogsService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // На @Public-роутах (логин, ручной запуск отчётов) req.user отсутствует
    const user = req.user as AuthedUser | undefined;
    const ip = req.headers['x-real-ip'] || req.ip;
    const action =
      this.reflector.get<string>(LOG_ACTION_KEY, context.getHandler()) ||
      `${req.method} ${req.url}`;

    // Запись в журнал не должна влиять на ответ запроса: в т.ч. на @Public-роутах,
    // где пользователя нет, и при недоступности БД (иначе процесс падает
    // из-за необработанного rejection внутри tap)
    const writeLog = (result: 'SUCCESS' | 'FAIL') => {
      this.logsService
        .log(action, ip, user?.id, {
          result,
          username: user?.username ?? 'anonymous',
          userAgent: req.headers['user-agent'],
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
