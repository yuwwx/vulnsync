// src/reports/reports.controller.ts
import { ProductAccessService } from '@/access/product-access.service';
import type { RequestUser } from '@/access/product-access.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FindingsReportService } from './findings-report.service';
import { ReportQueueService } from './report-queue.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private service: FindingsReportService,
    private queue: ReportQueueService,
    private access: ProductAccessService,
    private defectDojo: DefectDojoClient,
  ) {}

  // Ручной запуск отчёта - аналог `python3 dd-yesterday-findings.py`
  @LogAction('REPORTS_RUN_YESTERDAY_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('yesterday-findings/run')
  run() {
    return this.service.sendYesterdayFindingsReport();
  }

  // Отчёт по конкретной сборке (импорту скана) engagement DefectDojo.
  // Не отправляется сразу: ставится в очередь (см. ReportQueueService),
  // чтобы массовые запуски от пайплайнов не заваливали DefectDojo и SMTP.
  // VIEWER - для технических учеток из LDAP (пайплайны), ADMIN - для людей.
  @LogAction('REPORTS_RUN_BUILD_FINDINGS')
  @Public() // TODO: temporary, remove after testing
  @Post('builds/run')
  async runForBuild(
    @Body() body: { engagement_id?: number; build_id?: string },
  ) {
    const engagementId = Number(body?.engagement_id);
    const buildId = String(body?.build_id ?? '').trim();

    if (!Number.isInteger(engagementId) || engagementId <= 0) {
      throw new BadRequestException('Укажите engagement_id (целое число)');
    }

    if (!buildId) {
      throw new BadRequestException('Укажите build_id');
    }

    const runAt = await this.queue.enqueueBuildFindings({
      engagementId,
      buildId,
    });

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

  // CSV-экспорт findings продукта или группы продуктов.
  // Использует штатный экспорт DefectDojo v3, поэтому фильтры и колонки
  // совпадают с его findings, а доступ проверяется по группам продуктов.
  @LogAction('REPORTS_EXPORT_FINDINGS_CSV')
  @Get('findings/export.csv')
  async exportFindingsCsv(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
    @Query('productTypeId') productTypeId?: string,
    @Query('productId') productId?: string,
  ) {
    const typeId = productTypeId ? Number(productTypeId) : undefined;
    const prodId = productId ? Number(productId) : undefined;

    if (Boolean(typeId) === Boolean(prodId)) {
      throw new BadRequestException(
        'Укажите ровно одно: productTypeId или productId',
      );
    }

    const allowed = await this.access.getScope(user);

    let filter: { organization?: number; asset?: number };

    if (typeId) {
      this.access.assertIdInScope(allowed, typeId);
      filter = { organization: typeId };
    } else {
      const product = await this.defectDojo.getProduct(Number(prodId));

      this.access.assertIdInScope(allowed, Number(product?.prod_type));
      filter = { asset: Number(prodId) };
    }

    const csv = await this.defectDojo.getFindingsCsv(filter);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="findings-${typeId ? `product-type-${typeId}` : `product-${prodId}`}.csv"`,
    );

    // BOM, чтобы Excel корректно определил UTF-8 (в DefectDojo его нет).
    res.send(Buffer.concat([Buffer.from('\uFEFF'), csv]));
  }
}
