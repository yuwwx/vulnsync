import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Controller, Get } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @LogAction('LOGS_GET_ALL')
  @Roles('ADMIN')
  @Get()
  getLogs() {
    return this.logsService.findAll();
  }
}
