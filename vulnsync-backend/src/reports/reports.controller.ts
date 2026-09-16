// src/reports/reports.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Controller, Param, Post } from '@nestjs/common';
import { FindingsReportService } from './findings-report.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private service: FindingsReportService) {}

  // Ручной запуск отчёта - аналог `python3 dd-yesterday-findings.py`
  @LogAction('REPORTS_RUN_YESTERDAY_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('yesterday-findings/run')
  run() {
    return this.service.sendYesterdayFindingsReport();
  }

  // Отчёт по конкретному engagement DefectDojo.
  // VIEWER - для технических учеток из LDAP (пайплайны), ADMIN - для людей.
  @LogAction('REPORTS_RUN_ENGAGEMENT_FINDINGS')
  @Roles('VIEWER', 'ADMIN')
  @Public() // TODO: temporary, remove after testing
  @Post('engagements/:engagementId/run')
  runForEngagement(@Param('engagementId') engagementId: number) {
    return this.service.sendEngagementFindingsReport(engagementId);
  }
}
