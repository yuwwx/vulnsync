import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

export const LOG_ACTION_KEY = 'logAction';

export const LogAction =
  (action: string) => (target: any, key?: any, descriptor?: any) => {
    SetMetadata(LOG_ACTION_KEY, action)(target, key, descriptor);
    UseInterceptors(LoggingInterceptor)(target, key, descriptor);
  };
