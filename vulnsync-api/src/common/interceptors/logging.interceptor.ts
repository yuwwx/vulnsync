import { LogsService } from '@/logs/logs.service';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { LOG_ACTION_KEY } from '../decorators/logAction.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private logsService: LogsService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const action =
      this.reflector.get<string>(LOG_ACTION_KEY, context.getHandler()) ||
      `${req.method} ${req.url}`;

    return next.handle().pipe(
      tap(() => {
        this.logsService.log(action, req.ip, user.id, {
          username: user.username,
          userAgent: req.headers['user-agent'],
        });
      }),
    );
  }
}
