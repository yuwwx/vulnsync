// src/reports/reports.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Controller, Param, Post } from '@nestjs/common';
import { YesterdayFindingsService } from './yesterday-findings.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: YesterdayFindingsService) {}

  // Ручной запуск отчёта - аналог `python3 dd-yesterday-findings.py`
  @LogAction('REPORTS_RUN_YESTERDAY_FINDINGS')
  @Post('yesterday-findings/run')
  run() {
    return this.service.sendYesterdayFindingsReport();
  }

  // Отчёт по конкретному engagement DefectDojo
  @LogAction('REPORTS_RUN_ENGAGEMENT_FINDINGS')
  @Post('engagements/:engagementId/run')
  runForEngagement(@Param('engagementId') engagementId: number) {
    return this.service.sendEngagementFindingsReport(engagementId);
  }
}
