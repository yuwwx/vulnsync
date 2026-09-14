// src/reports/yesterday-findings.service.ts
// Порт dd-pipeline-scripts/dd-yesterday-findings.py: крон-джоба раз в день
// отправляет отчёт об уязвимостях, обнаруженных в DefectDojo за прошлые сутки.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { parseEmailList } from '@/notifications/product-type-notifications.service';
import { ProductTypeNotificationsService } from '@/notifications/product-type-notifications.service';
import { MailerService } from './mailer.service';
import {
  FindingsReportRow,
  escapeHtml,
  renderErrorReport,
  renderFindingsReport,
} from './report-templates';

type Finding = Record<string, unknown>;

const SEVERITY_ORDER: Record<string, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
};

const REPORT_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const FINDINGS_LIMIT = 1000;

function asString(value: unknown): string {
  if (value == null || typeof value === 'object') {
    return '';
  }

  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      return '';
  }
}

function getNested(finding: Finding, path: string): string {
  let current: unknown = finding;

  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[key];
  }

  return asString(current);
}

function severityRank(finding?: Finding): number {
  return SEVERITY_ORDER[asString(finding?.severity)] ?? 0;
}

function sortBySeverity(findings: Finding[]): Finding[] {
  // Сортировка по убыванию критичности - как в Python-скрипте
  return [...findings].sort((a, b) => severityRank(b) - severityRank(a));
}

@Injectable()
export class YesterdayFindingsService {
  private readonly logger = new Logger(YesterdayFindingsService.name);

  constructor(
    private readonly defectDojoClient: DefectDojoClient,
    private readonly productTypeNotifications: ProductTypeNotificationsService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  // Аналог crontab: 0 8 * * * (переопределяется DD_REPORT_CRON)
  @Cron(process.env.DD_REPORT_CRON ?? '0 8 * * *')
  async handleCron() {
    await this.sendYesterdayFindingsReport();
  }

  async sendYesterdayFindingsReport() {
    const yesterday = this.formatYesterday();

    this.logger.log('=== Yesterday findings report: started ===');

    try {
      const findings = await this.getYesterdayFindings(yesterday);

      await this.sendFindingsReportEmail({
        title: `Отчёт об уязвимостях за ${yesterday}`,
        intro: `Добрый день! ${yesterday} было обнаружено <b>${findings.length}</b> уязвимостей.`,
        subject: `Отчет об уязвимостях за ${yesterday} (новых - ${findings.length})`,
        findings,
      });

      this.logger.log(
        `=== Yesterday findings report: sent (${findings.length} findings) ===`,
      );
    } catch (error) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : String(error);

      this.logger.error(
        'Yesterday findings report failed',
        error instanceof Error ? error.stack : String(error),
      );

      await this.sendErrorReport(details, this.formatTimestamp(new Date()));
    }
  }

  // Отчёт по конкретному engagement: GET findings по test__engagement
  async sendEngagementFindingsReport(engagementId: number) {
    this.logger.log(
      `=== Engagement findings report: started (id=${engagementId}) ===`,
    );

    const engagement = await this.defectDojoClient.getEngagement(engagementId);

    const findings = await this.getFindingsByEngagement(engagementId);
    const engagementName =
      asString(engagement?.name) ||
      this.getEngagementName(findings, engagementId);

    const summary = await this.sendFindingsReportEmail({
      title: `Отчёт об уязвимостях по сборке ${escapeHtml(engagementName)}`,
      intro: `Добрый день! Общее количество обнаруженных уязвимостей по сборке ${escapeHtml(engagementName)} - <b>${findings.length}</b>.`,
      subject: `Отчет об уязвимостях (сборка ${engagementName}, всего уязвимостей - ${findings.length})`,
      findings,
      productTypeId: await this.getEngagementProductTypeId(engagement),
    });

    this.logger.log(
      `=== Engagement findings report: sent (${findings.length} findings) ===`,
    );

    return { engagementId, engagementName, ...summary };
  }

  private async getYesterdayFindings(yesterday: string): Promise<Finding[]> {
    const client = await this.defectDojoClient.getClient();

    this.logger.log(`Requesting DefectDojo findings for ${yesterday}`);

    const { data } = await client.get<{ results?: Finding[] }>(
      '/api/v2/findings/',
      {
        params: {
          active: true,
          discovered_on: yesterday,
          related_fields: true,
          o: 'severity',
          limit: FINDINGS_LIMIT,
        },
      },
    );

    const results: Finding[] = Array.isArray(data?.results) ? data.results : [];

    return sortBySeverity(results);
  }

  private async getFindingsByEngagement(
    engagementId: number,
  ): Promise<Finding[]> {
    const client = await this.defectDojoClient.getClient();

    this.logger.log(
      `Requesting DefectDojo findings for engagement ${engagementId}`,
    );

    const { data } = await client.get<{ results?: Finding[] }>(
      '/api/v2/findings/',
      {
        params: {
          test__engagement: engagementId,
          related_fields: true,
          o: 'severity',
          limit: FINDINGS_LIMIT,
        },
      },
    );

    const results: Finding[] = Array.isArray(data?.results) ? data.results : [];

    return sortBySeverity(results);
  }

  private getEngagementName(findings: Finding[], engagementId: number): string {
    const name = findings[0]
      ? getNested(findings[0], 'related_fields.test.engagement.name')
      : '';

    return name || `#${engagementId}`;
  }

  private async sendFindingsReportEmail(params: {
    title: string;
    intro: string;
    subject: string;
    findings: Finding[];
    // Тип продукта DefectDojo: к общему DD_REPORT_MAIL_TO добавляются
    // адреса из настроек уведомлений этого типа продукта
    productTypeId?: number;
  }) {
    const baseUrl = await this.defectDojoClient.getBaseUrl();
    const counts = this.countBySeverity(params.findings);

    const html = renderFindingsReport({
      title: params.title,
      intro: params.intro,
      timestamp: this.formatTimestamp(new Date()),
      count: params.findings.length,
      severity: counts,
      rows: this.buildReportRows(params.findings, baseUrl),
    });

    const to = await this.resolveRecipients(params.productTypeId);

    await this.mailer.send({ to, subject: params.subject, html });

    return {
      totalFindings: params.findings.length,
      severity: counts,
    };
  }

  // Тип продукта, к которому относится engagement
  private async getEngagementProductTypeId(
    engagement: { product?: number } | null,
  ): Promise<number | undefined> {
    const productId = Number(engagement?.product);

    if (!productId) {
      return undefined;
    }

    const product = (await this.defectDojoClient.getProduct(productId)) as {
      prod_type?: number;
    } | null;

    return Number(product?.prod_type) || undefined;
  }

  // DD_REPORT_MAIL_TO + адреса, настроенные для конкретного типа продукта
  private async resolveRecipients(productTypeId?: number): Promise<string> {
    const recipients = parseEmailList(this.getRequiredEnv('DD_REPORT_MAIL_TO'));

    if (productTypeId) {
      for (const email of await this.productTypeNotifications.getExtraEmails(
        productTypeId,
      )) {
        if (!recipients.some((r) => r.toLowerCase() === email.toLowerCase())) {
          recipients.push(email);
        }
      }
    }

    return recipients.join(', ');
  }

  private buildReportRows(
    findings: Finding[],
    baseUrl: string,
  ): FindingsReportRow[] {
    return findings.map((f) => ({
      id: asString(f.id),
      findingUrl: `${baseUrl}/finding/${asString(f.id)}`,
      productType: getNested(
        f,
        'related_fields.test.engagement.product.prod_type.name',
      ),
      productName: getNested(f, 'related_fields.test.engagement.product.name'),
      engagement: getNested(f, 'related_fields.test.engagement.name'),
      testType: getNested(f, 'related_fields.test.test_type.name'),
      title: asString(f.title),
      severity: asString(f.severity),
      cvssScore: asString(f.cvssv3_score),
      created: asString(f.created),
    }));
  }

  private countBySeverity(findings: Finding[]) {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    for (const f of findings) {
      const severity = asString(f?.severity);

      if ((REPORT_SEVERITIES as readonly string[]).includes(severity)) {
        counts[severity as (typeof REPORT_SEVERITIES)[number]] += 1;
      }
    }

    return counts;
  }

  private async sendErrorReport(error: string, timestamp: string) {
    try {
      const to =
        this.config.get<string>('DD_REPORT_MAIL_ERROR_TO') ||
        this.getRequiredEnv('DD_REPORT_MAIL_TO');

      await this.mailer.send({
        to,
        subject: '❗ Ошибка отчёта',
        html: renderErrorReport({ error, timestamp }),
      });
    } catch (mailError) {
      this.logger.error(
        'Failed to send error report email',
        mailError instanceof Error ? mailError.stack : String(mailError),
      );
    }
  }

  private getRequiredEnv(name: string): string {
    const value = this.config.get<string>(name);

    if (!value?.trim()) {
      throw new Error(`${name} is not configured`);
    }

    return value;
  }

  private formatYesterday(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);

    return this.formatDate(date);
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${this.formatDate(date)}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  }
}
