import { Controller, Get, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @LogAction('LOGS_GET_ALL')
  @Get()
  getLogs() {
    return this.logsService.findAll();
  }
}
