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

const TYPE_ENGAGEMENT_FINDINGS = 'ENGAGEMENT_FINDINGS';

@Injectable()
export class ReportQueueService {
  private readonly logger = new Logger(ReportQueueService.name);

  constructor(
    private prisma: PrismaService,
    private findingsReport: FindingsReportService,
  ) {}

  // Поставить отчёт по engagement в очередь.
  // Повторный вызов, пока отчёт ещё не отправлен, ничего не меняет:
  // первый вызов выигрывает (throttle), повторной рассылки не будет.
  async enqueueEngagementFindings(engagementId: number): Promise<Date> {
    const runAt = new Date(Date.now() + REPORT_RUN_DELAY_MS);

    const existing = await this.prisma.reportQueueItem.findUnique({
      where: {
        type_externalId: {
          type: TYPE_ENGAGEMENT_FINDINGS,
          externalId: String(engagementId),
        },
      },
    });

    if (existing) {
      return existing.runAt;
    }

    await this.prisma.reportQueueItem.create({
      data: {
        type: TYPE_ENGAGEMENT_FINDINGS,
        externalId: String(engagementId),
        runAt,
      },
    });

    this.logger.log(
      `Report queued: type=${TYPE_ENGAGEMENT_FINDINGS}, engagementId=${engagementId}, runAt=${runAt.toISOString()}`,
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
    if (type === TYPE_ENGAGEMENT_FINDINGS) {
      await this.findingsReport.sendEngagementFindingsReport(
        Number(externalId),
      );
      return;
    }

    this.logger.warn(`Unknown report queue item type: ${type}`);
  }
}
