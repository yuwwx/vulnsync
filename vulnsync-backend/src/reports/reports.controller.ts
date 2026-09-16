// src/reports/reports.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Controller, Param, Post } from '@nestjs/common';
import { FindingsReportService } from './findings-report.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: FindingsReportService) {}

  // Ручной запуск отчёта - аналог `python3 dd-yesterday-findings.py`
  @LogAction('REPORTS_RUN_YESTERDAY_FINDINGS')
  @Post('yesterday-findings/run')
  run() {
    return this.service.sendYesterdayFindingsReport();
  }

  // Отчёт по конкретному engagement DefectDojo.
  // VIEWER - для технических учеток из LDAP (пайплайны), ADMIN - для людей.
  @LogAction('REPORTS_RUN_ENGAGEMENT_FINDINGS')
  @Roles('VIEWER', 'ADMIN')
  @Post('engagements/:engagementId/run')
  runForEngagement(@Param('engagementId') engagementId: number) {
    return this.service.sendEngagementFindingsReport(engagementId);
  }
}
