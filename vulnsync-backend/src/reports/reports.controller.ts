// src/reports/reports.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';
import { FindingsReportService } from './findings-report.service';
import { ReportQueueService } from './report-queue.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('reports')
export class ReportsController {
  constructor(
    private service: FindingsReportService,
    private queue: ReportQueueService,
  ) {}

  // Ручной запуск отчёта - аналог `python3 dd-yesterday-findings.py`
  @LogAction('REPORTS_RUN_YESTERDAY_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('yesterday-findings/run')
  run() {
    return this.service.sendYesterdayFindingsReport();
  }

  // Отчёт по конкретному engagement DefectDojo.
  // Не отправляется сразу: ставится в очередь (см. ReportQueueService),
  // чтобы массовые запуски от пайплайнов не заваливали DefectDojo и SMTP.
  // VIEWER - для технических учеток из LDAP (пайплайны), ADMIN - для людей.
  @LogAction('REPORTS_RUN_ENGAGEMENT_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('engagements/:engagementId/run')
  async runForEngagement(@Param('engagementId') engagementId: number) {
    const runAt = await this.queue.enqueueEngagementFindings(
      Number(engagementId),
    );

    return { status: 'queued', runAt: runAt.toISOString() };
  }

  // Полный отчёт по активным findings продукта или типа продуктов.
  // Ставится в очередь, письмо придёт через ~5 минут.
  @LogAction('REPORTS_RUN_FULL_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('findings/run')
  async runForFindings(
    @Body() body: { productTypeId?: number; productId?: number },
  ) {
    const scope = {
      productTypeId: body.productTypeId,
      productId: body.productId,
    };

    if (Boolean(scope.productTypeId) === Boolean(scope.productId)) {
      throw new BadRequestException(
        'Укажите ровно одно: productTypeId или productId',
      );
    }

    const runAt = await this.queue.enqueueFullFindings(scope);

    return { status: 'queued', runAt: runAt.toISOString() };
  }
}
