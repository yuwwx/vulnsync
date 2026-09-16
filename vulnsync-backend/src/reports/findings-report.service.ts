// src/reports/findings-report.service.ts
// Порт dd-pipeline-scripts/dd-yesterday-findings.py: крон-джоба раз в день
// отправляет отчёт об уязвимостях, обнаруженных в DefectDojo за прошлые сутки.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { severityWeight } from '@/common/severity';
import { parseEmailList } from '@/common/email';
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { ProductTypeNotificationsService } from '@/notifications/product-type-notifications.service';
import { MailerService } from './mailer.service';
import {
  EngagementFindingItem,
  FindingsReportRow,
  escapeHtml,
  htmlToPlainText,
  renderEngagementFindingsReport,
  renderErrorReport,
  renderFindingsReport,
} from './report-templates';

type Finding = Record<string, unknown>;

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

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  return null;
}

// Component для SCA-findings: pkg:maven/org.apache.tomcat.embed/...
// fallback на легаси-поля component_name/component_version
function extractComponent(finding: Finding): string {
  const name = asString(finding.component_name);
  const version = asString(finding.component_version);

  if (name && version) {
    return `${name} ${version}`;
  }

  return name || '';
}

// ["CVE-...","GHSA-..."] -> строка через запятую
function extractVulnerabilityIds(finding: Finding): string {
  const ids = finding.vulnerability_ids;

  if (!Array.isArray(ids)) {
    return '';
  }

  return ids
    .map((item) =>
      item && typeof item === 'object'
        ? asString((item as Record<string, unknown>).vulnerability_id)
        : '',
    )
    .filter(Boolean)
    .join(', ');
}

// Location в DefectDojo может быть строкой, объектом {path, line, ...}
// или отсутствовать - тогда откатываемся на легаси-поле file_path
function extractLocation(finding: Finding): string {
  const location = finding.location;

  if (typeof location === 'string' && location.trim()) {
    return location;
  }

  if (location && typeof location === 'object') {
    const record = location as Record<string, unknown>;
    const path = asString(record.path);
    const line = asString(record.line);

    if (path && line) {
      return `${path}:${line}`;
    }

    if (path) {
      return path;
    }
  }

  return asString(finding.file_path);
}

function sortBySeverity(findings: Finding[]): Finding[] {
  // Сортировка по убыванию критичности - как в Python-скрипте
  return [...findings].sort(
    (a, b) =>
      severityWeight(asString(b.severity)) -
      severityWeight(asString(a.severity)),
  );
}

@Injectable()
export class FindingsReportService {
  private readonly logger = new Logger(FindingsReportService.name);

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
      const findings = await this.fetchFindings(
        { active: true, discovered_on: yesterday },
        `discovered_on=${yesterday}`,
      );

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

    const findings = await this.fetchFindings(
      { test__engagement: engagementId },
      `engagement=${engagementId}`,
    );
    const engagementName =
      asString(engagement?.name) ||
      this.getEngagementName(findings, engagementId);

    const product = await this.getEngagementProduct(engagement);
    // Название продукта - в заголовок и тему письма (если резолвится)
    const productSubject = product?.name ? `проект ${product.name}, ` : '';
    // Контекст сборки из engagement: версия, ID сборки, ветка/тег
    const buildInfo = [
      engagement?.version && `v${engagement.version}`,
      engagement?.build_id && `build ${engagement.build_id}`,
      engagement?.branch_tag,
    ]
      .filter(Boolean)
      .join(' · ');

    const summary = await this.sendFindingsReportEmail({
      title: `Отчёт об уязвимостях (${productSubject}сборка ${engagementName})`,
      intro: `Добрый день! Общее количество новых обнаруженных уязвимостей в сборке ${escapeHtml(engagementName)} - <b>${findings.length}</b>.`,
      subject: `Отчет об уязвимостях (${productSubject}сборка ${engagementName}, всего уязвимостей - ${findings.length})`,
      findings,
      productTypeId: product?.typeId,
      productName: product?.name,
      engagementName,
      buildInfo,
      // Отчёт по engagement отправляем списком с описанием уязвимостей
      listView: true,
    });

    this.logger.log(
      `=== Engagement findings report: sent (${findings.length} findings) ===`,
    );

    return { engagementId, engagementName, ...summary };
  }

  // GET /api/v2/findings/ с сортировкой по критичности.
  // Дополнительно всегда запрашиваем related_fields: из них берутся
  // продукт/engagement/тип теста для шапки письма.
  private async fetchFindings(
    params: Record<string, unknown>,
    logContext: string,
  ): Promise<Finding[]> {
    const client = await this.defectDojoClient.getClient();

    this.logger.log(`Requesting DefectDojo findings: ${logContext}`);

    const { data } = await client.get<{ results?: Finding[] }>(
      '/api/v2/findings/',
      {
        params: {
          related_fields: true,
          o: 'severity',
          limit: FINDINGS_LIMIT,
          ...params,
        },
      },
    );

    return sortBySeverity(Array.isArray(data?.results) ? data.results : []);
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
    // Проект и сборка для шапки письма (только в списковом виде)
    productName?: string;
    engagementName?: string;
    // Контекст сборки: версия, build id, ветка/тег (только в списковом виде)
    buildInfo?: string;
    // Список уязвимостей с описанием (engagement) вместо таблицы
    listView?: boolean;
  }) {
    const baseUrl = await this.defectDojoClient.getBaseUrl();
    const counts = this.countBySeverity(params.findings);
    const timestamp = this.formatTimestamp(new Date());

    const html = params.listView
      ? renderEngagementFindingsReport({
          title: params.title,
          intro: params.intro,
          timestamp,
          count: params.findings.length,
          productName: params.productName,
          engagementName: params.engagementName,
          buildInfo: params.buildInfo,
          severity: counts,
          items: this.buildReportItems(params.findings, baseUrl),
        })
      : renderFindingsReport({
          title: params.title,
          intro: params.intro,
          timestamp,
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

  // Тип продукта и его название по engagement (название - для шапки письма)
  private async getEngagementProduct(
    engagement: { product?: number } | null,
  ): Promise<{ name?: string; typeId?: number } | null> {
    const productId = Number(engagement?.product);

    if (!productId) {
      return null;
    }

    const product = (await this.defectDojoClient.getProduct(productId)) as {
      name?: string;
      prod_type?: number;
    } | null;

    if (!product) {
      return null;
    }

    return {
      name: asString(product.name),
      typeId: Number(product.prod_type) || undefined,
    };
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

  // Элементы списка для отчёта по engagement: с описанием уязвимости
  private buildReportItems(
    findings: Finding[],
    baseUrl: string,
  ): EngagementFindingItem[] {
    return findings.map((f) => {
      const fixAvailable = asBool(f.fix_available);

      return {
        id: asString(f.id),
        findingUrl: `${baseUrl}/finding/${asString(f.id)}`,
        title: asString(f.title),
        severity: asString(f.severity),
        cvssScore: asString(f.cvssv3_score),
        created: asString(f.created),
        testType: getNested(f, 'related_fields.test.test_type.name'),
        description: htmlToPlainText(asString(f.description)),
        location: extractLocation(f),
        // в DefectDojo v3 поле называется "line" ("line_number" - в старых версиях)
        lineNumber: asString(f.line) || asString(f.line_number),
        component: extractComponent(f),
        vulnerabilityIds: extractVulnerabilityIds(f),
        cvssv3: asString(f.cvssv3),
        epssScore: asNumber(f.epss_score)?.toString() ?? '',
        // перцентиль EPSS удобнее читать в процентах (0.48 -> 48%)
        epssPercentile: this.formatPercent(f.epss_percentile),
        fixAvailable: fixAvailable === null ? '' : fixAvailable ? 'Yes' : 'No',
        fixVersion: asString(f.fix_version),
        knownExploited: asBool(f.known_exploited) ? 'Yes' : '',
        ransomwareUsed: asBool(f.ransomware_used) ? 'Yes' : '',
        mitigation: htmlToPlainText(asString(f.mitigation)),
        impact: htmlToPlainText(asString(f.impact)),
        stepsToReproduce: htmlToPlainText(asString(f.steps_to_reproduce)),
        severityJustification: htmlToPlainText(
          asString(f.severity_justification),
        ),
        references: htmlToPlainText(asString(f.references)),
      };
    });
  }

  // 0.48228 -> "48.23%"
  private formatPercent(value: unknown): string {
    const num = asNumber(value);

    return num === null ? '' : `${(num * 100).toFixed(2)}%`;
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
