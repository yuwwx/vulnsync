// Очередь отправки отчётов: сглаживает нагрузку на DefectDojo и SMTP,
// когда отчёты запускают массово (пайплайны, еженедельные отчёты по продуктам).
// Пункты лежат в таблице ReportQueueItem и переживают рестарт приложения.
// Диспетчер раз в минуту выполняет не более QUEUE_BATCH доcтупных пунктов.
import { FindingsReportService } from '@/reports/findings-report.service';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

// Через сколько минут после постановки в очередь отчёт отправляется
const REPORT_RUN_DELAY_MS = 5 * 60 * 1000;

// Максимум отчётов за один проход диспетчера (раз в минуту)
const QUEUE_BATCH = 5;

const TYPE_BUILD_FINDINGS = 'BUILD_FINDINGS';
const TYPE_PRODUCT_FINDINGS = 'PRODUCT_FINDINGS';
const TYPE_PRODUCT_TYPE_FINDINGS = 'PRODUCT_TYPE_FINDINGS';

// Полный отчёт: либо по конкретному продукту, либо по типу продуктов
type FullFindingsScope = { productTypeId?: number; productId?: number };

// Отчёт по сборке: engagement + build_id импорта скана
type BuildFindingsScope = { engagementId: number; buildId: string };

// externalId пункта очереди для сборки: "<engagementId>:<buildId>".
// engagementId - число, ':' режем по первому вхождению (может быть в build_id)
function toQueueExternalId(scope: BuildFindingsScope): string {
  return `${scope.engagementId}:${scope.buildId}`;
}

function parseQueueExternalId(externalId: string): BuildFindingsScope | null {
  const separator = externalId.indexOf(':');
  const engagementId = Number(externalId.slice(0, separator));

  if (separator <= 0 || !Number.isInteger(engagementId) || engagementId <= 0) {
    return null;
  }

  const buildId = externalId.slice(separator + 1);

  return buildId ? { engagementId, buildId } : null;
}

@Injectable()
export class ReportQueueService {
  private readonly logger = new Logger(ReportQueueService.name);

  constructor(
    private prisma: PrismaService,
    private findingsReport: FindingsReportService,
  ) {}

  // Поставить отчёт по сборке (импорту скана) в очередь.
  // Throttle тот же: пока отчёт в очереди, повторная постановка не меняет срок.
  async enqueueBuildFindings(scope: BuildFindingsScope): Promise<Date> {
    const runAt = new Date(Date.now() + REPORT_RUN_DELAY_MS);
    const externalId = toQueueExternalId(scope);

    const existing = await this.prisma.reportQueueItem.findUnique({
      where: {
        type_externalId: {
          type: TYPE_BUILD_FINDINGS,
          externalId,
        },
      },
    });

    if (existing) {
      return existing.runAt;
    }

    await this.prisma.reportQueueItem.create({
      data: {
        type: TYPE_BUILD_FINDINGS,
        externalId,
        runAt,
      },
    });

    this.logger.log(
      `Report queued: type=${TYPE_BUILD_FINDINGS}, engagementId=${scope.engagementId}, buildId=${scope.buildId}, runAt=${runAt.toISOString()}`,
    );

    return runAt;
  }

  // Полный отчёт по продукту или типу продуктов.
  // Throttle тот же: пока отчёт в очереди, повторная постановка не меняет срок.
  async enqueueFullFindings(scope: FullFindingsScope): Promise<Date> {
    const [type, externalId] = scope.productId
      ? [TYPE_PRODUCT_FINDINGS, String(scope.productId)]
      : [TYPE_PRODUCT_TYPE_FINDINGS, String(scope.productTypeId)];

    const runAt = new Date(Date.now() + REPORT_RUN_DELAY_MS);

    const existing = await this.prisma.reportQueueItem.findUnique({
      where: { type_externalId: { type, externalId } },
    });

    if (existing) {
      return existing.runAt;
    }

    await this.prisma.reportQueueItem.create({
      data: { type, externalId, runAt },
    });

    this.logger.log(
      `Report queued: type=${type}, externalId=${externalId}, runAt=${runAt.toISOString()}`,
    );

    return runAt;
  }

  @Interval(60_000)
  async dispatchDue() {
    const due = await this.prisma.reportQueueItem.findMany({
      where: { runAt: { lte: new Date() } },
      orderBy: { runAt: 'asc' },
      take: QUEUE_BATCH,
    });

    for (const item of due) {
      // Удаляем до выполнения: при падении приложения пункт не уйдёт дважды
      const deleted = await this.prisma.reportQueueItem.deleteMany({
        where: { id: item.id },
      });

      if (!deleted.count) {
        continue;
      }

      try {
        await this.dispatch(item.type, item.externalId);
      } catch (error) {
        // Отчёт не отправлен: ошибка в логах, перезапустить можно
        // повторным вызовом run-endpoint'а
        this.logger.error(
          `Report queue item failed: type=${item.type}, externalId=${item.externalId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async dispatch(type: string, externalId: string) {
    if (type === TYPE_BUILD_FINDINGS) {
      const scope = parseQueueExternalId(externalId);

      if (!scope) {
        this.logger.error(
          `Invalid externalId for report queue item: type=${type}, externalId=${externalId}`,
        );
        return;
      }

      await this.findingsReport.sendBuildFindingsReport(scope);
      return;
    }

    if (type === TYPE_PRODUCT_FINDINGS) {
      await this.findingsReport.sendFullFindingsReport({
        productId: Number(externalId),
      });
      return;
    }

    if (type === TYPE_PRODUCT_TYPE_FINDINGS) {
      await this.findingsReport.sendFullFindingsReport({
        productTypeId: Number(externalId),
      });
      return;
    }

    this.logger.warn(`Unknown report queue item type: ${type}`);
  }
}
