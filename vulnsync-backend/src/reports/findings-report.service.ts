// src/reports/findings-report.service.ts
// Порт dd-pipeline-scripts/dd-yesterday-findings.py: крон-джоба раз в день
// отправляет отчёт об уязвимостях, обнаруженных в DefectDojo за прошлые сутки.
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

// Элемент action set'а импорта DefectDojo (test_import_finding_action_set)
type TestImportFindingAction = {
  // N - created, C - closed, R - reactivated, U - untouched
  action?: string;
  finding?: number | string;
};

// Импорт скана DefectDojo (запись на каждый import/reimport)
type TestImport = {
  id?: number;
  test_import_finding_action_set?: TestImportFindingAction[];
};

const REPORT_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const FINDINGS_LIMIT = 10000;

// Действия импорта DefectDojo (Test_Import_Finding_Action.action)
const IMPORT_ACTION_CREATED = 'N';
const IMPORT_ACTION_CLOSED = 'C';
const IMPORT_ACTION_REACTIVATED = 'R';
const IMPORT_ACTION_UNTOUCHED = 'U';

// Порция id при выборке findings по списку (лимит длины URL)
const FINDINGS_ID_BATCH = 200;

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

  // Отчёт по конкретной сборке engagement: изменения берём из импорта скана -
  // GET /api/v2/test_imports/?build_id= возвращает action set'ы импорта
  // (N - created, C - closed, R - reactivated, U - untouched), затем
  // выгружаем сами findings по их id. Untouched в отчёт не попадает.
  async sendBuildFindingsReport(scope: {
    engagementId: number;
    buildId: string;
  }) {
    const { engagementId, buildId } = scope;

    this.logger.log(
      `=== Build findings report: started (engagement=${engagementId}, build=${buildId}) ===`,
    );

    const engagement = await this.defectDojoClient.getEngagement(engagementId);
    const product = await this.getEngagementProduct(engagement);

    const testImports = await this.fetchTestImports(buildId);

    if (!testImports.length) {
      throw new BadRequestException(
        `No test imports found in DefectDojo for build_id=${buildId}`,
      );
    }

    // Один build_id может попасть в несколько импортов (reimport):
    // записи отсортированы по возрастанию id, последняя перекрывает
    // действия предыдущих
    const actionByFindingId = new Map<string, string>();

    for (const testImport of testImports) {
      for (const entry of testImport.test_import_finding_action_set ?? []) {
        const findingId = asString(entry?.finding);

        if (findingId) {
          actionByFindingId.set(findingId, asString(entry?.action));
        }
      }
    }

    // Скоуп по engagement отсекает импорты с тем же build_id в других engagement
    const findings = await this.fetchFindingsByIds(
      [...actionByFindingId.keys()],
      engagementId,
      `build=${buildId}, engagement=${engagementId}`,
    );

    // Разнос по действию импорта
    const created: Finding[] = [];
    const closed: Finding[] = [];
    const reactivated: Finding[] = [];
    let untouchedCount = 0;
    let unknownCount = 0;

    for (const finding of findings) {
      switch (actionByFindingId.get(asString(finding.id))) {
        case IMPORT_ACTION_CREATED:
          created.push(finding);
          break;
        case IMPORT_ACTION_CLOSED:
          closed.push(finding);
          break;
        case IMPORT_ACTION_REACTIVATED:
          reactivated.push(finding);
          break;
        case IMPORT_ACTION_UNTOUCHED:
          untouchedCount += 1;
          break;
        default:
          unknownCount += 1;
      }
    }

    if (unknownCount) {
      this.logger.warn(
        `Build findings report: ${unknownCount} findings without import action (engagement=${engagementId}, build=${buildId})`,
      );
    }

    // Название продукта - в заголовок и тему письма (если резолвится)
    const productSubject = product?.name ? `проект ${product.name}, ` : '';
    // Сборку теперь определяет build_id; в контексте остаются только
    // версия и ветка/тег из engagement
    const buildInfo = [
      engagement?.version && `v${engagement.version}`,
      engagement?.branch_tag,
    ]
      .filter(Boolean)
      .join(' · ');

    // В теме перечисляем ненулевые категории изменений
    const subjectCounts = [
      created.length && `новых - ${created.length}`,
      closed.length && `закрытых - ${closed.length}`,
      reactivated.length && `переоткрытых - ${reactivated.length}`,
    ]
      .filter(Boolean)
      .join(', ');

    const summary = await this.sendFindingsReportEmail({
      title: `Отчёт об уязвимостях (${productSubject}сборка ${buildId})`,
      intro: `Добрый день! Изменения в сборке ${escapeHtml(buildId)}: новых - <b>${created.length}</b>, закрытых - <b>${closed.length}</b>, переоткрытых - <b>${reactivated.length}</b>, без изменений - <b>${untouchedCount}</b>.`,
      subject: `Отчет об уязвимостях (${productSubject}сборка ${buildId}${subjectCounts ? `, ${subjectCounts}` : ''})`,
      sections: [
        { label: 'Новые уязвимости', findings: created },
        { label: 'Закрытые уязвимости', findings: closed },
        { label: 'Переоткрытые уязвимости', findings: reactivated },
      ],
      productTypeId: product?.typeId,
      productName: product?.name,
      buildId,
      buildInfo,
      // Отчёт по сборке отправляем списком с описанием уязвимостей
      listView: true,
    });

    this.logger.log(
      `=== Build findings report: sent (created=${created.length}, closed=${closed.length}, reactivated=${reactivated.length}, untouched=${untouchedCount}) ===`,
    );

    return {
      engagementId,
      buildId,
      created: created.length,
      closed: closed.length,
      reactivated: reactivated.length,
      untouched: untouchedCount,
      ...summary,
    };
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

  // Импорты скана по build_id: из них берём test_import_finding_action_set -
  // какие действия (N/C/R/U) импорт произвёл с каждой уязвимостью
  private async fetchTestImports(buildId: string): Promise<TestImport[]> {
    const client = await this.defectDojoClient.getClient();

    this.logger.log(`Requesting DefectDojo test imports: build_id=${buildId}`);

    const { data } = await client.get<{ results?: TestImport[] }>(
      '/api/v2/test_imports/',
      {
        params: {
          build_id: buildId,
          // по возрастанию id: действия последнего импорта перекрывают ранние
          o: 'id',
          limit: FINDINGS_LIMIT,
        },
      },
    );

    return Array.isArray(data?.results) ? data.results : [];
  }

  // Findings по набору id из action set'ов импорта. Фильтр id DD читает как
  // "in": /api/v2/findings/?id=1,2,3. Идём порциями, чтобы не упереться
  // в лимит длины URL.
  private async fetchFindingsByIds(
    findingIds: string[],
    engagementId: number,
    logContext: string,
  ): Promise<Finding[]> {
    const idFilters: string[] = [];

    for (let i = 0; i < findingIds.length; i += FINDINGS_ID_BATCH) {
      idFilters.push(findingIds.slice(i, i + FINDINGS_ID_BATCH).join(','));
    }

    const batches = await Promise.all(
      idFilters.map((ids) =>
        this.fetchFindings(
          { id: ids, test__engagement: engagementId },
          `${logContext}, batch of ${ids.split(',').length} ids`,
        ),
      ),
    );

    return batches.flat();
  }

  // Полный отчёт по активным findings продукта или типа продуктов.
  // В очередь ставится через ReportQueueService (см. reports.controller).
  async sendFullFindingsReport(scope: {
    productTypeId?: number;
    productId?: number;
  }) {
    const productTypeId =
      scope.productTypeId ??
      (await this.resolveProductTypeId(scope.productId!));

    let scopeLabel = `тип продуктов #${productTypeId}`;
    let productName: string | undefined;

    if (scope.productId) {
      const product = await this.defectDojoClient.getProduct(scope.productId);
      productName = asString(product?.name);
      scopeLabel = `продукт ${productName || `#${scope.productId}`}`;
    } else {
      const productTypes = await this.defectDojoClient.getProductTypes();
      const typeName = asString(
        productTypes.find((t) => t.id === productTypeId)?.name,
      );

      if (typeName) {
        scopeLabel = `тип продуктов ${typeName}`;
      }
    }

    const findings = await this.fetchFindings(
      scope.productId
        ? { active: true, test__engagement__product: scope.productId }
        : {
            active: true,
            test__engagement__product__prod_type: productTypeId,
          },
      `full report, ${scopeLabel}`,
    );

    return this.sendFindingsReportEmail({
      title: `Полный отчёт по уязвимостям: ${scopeLabel}`,
      intro: `Полный список активных уязвимостей: <b>${findings.length}</b>.`,
      subject: `Полный отчёт по уязвимостям (${scopeLabel}, всего - ${findings.length})`,
      findings,
      productTypeId,
      productName,
      listView: true,
    });
  }

  // Тип продукта по идентификатору продукта (для получателей письма)
  private async resolveProductTypeId(productId: number): Promise<number> {
    const product = await this.defectDojoClient.getProduct(productId);
    const productTypeId = Number(product?.prod_type);

    if (!productTypeId) {
      throw new BadRequestException(
        `Product ${productId} has no prod_type in DefectDojo`,
      );
    }

    return productTypeId;
  }

  private async sendFindingsReportEmail(params: {
    title: string;
    intro: string;
    subject: string;
    // Табличный/списковый отчёт одним списком (yesterday, полный отчёт)
    findings?: Finding[];
    // Списковый отчёт по сборке: секции по действию импорта
    // (created/closed/reactivated; untouched в отчёт не попадает)
    sections?: Array<{ label: string; findings: Finding[] }>;
    // Тип продукта DefectDojo: к общему DD_REPORT_MAIL_TO добавляются
    // адреса из настроек уведомлений этого типа продукта
    productTypeId?: number;
    // Проект и сборка для шапки письма (только в списковом виде)
    productName?: string;
    // build_id импорта вместо имени engagement
    buildId?: string;
    // Контекст сборки: версия, ветка/тег (только в списковом виде)
    buildInfo?: string;
    // Список уязвимостей с описанием вместо таблицы
    listView?: boolean;
  }) {
    const baseUrl = await this.defectDojoClient.getBaseUrl();

    const reportFindings = params.sections
      ? params.sections.flatMap((section) => section.findings)
      : (params.findings ?? []);

    const counts = this.countBySeverity(reportFindings);
    const timestamp = this.formatTimestamp(new Date());

    // Списковый отчёт: либо секции по сборке, либо один плоский список
    // без заголовка (полный отчёт)
    const sections = params.sections
      ? params.sections.map((section) => ({
          label: section.label,
          items: this.buildReportItems(section.findings, baseUrl),
        }))
      : [{ items: this.buildReportItems(reportFindings, baseUrl) }];

    const html = params.listView
      ? renderEngagementFindingsReport({
          title: params.title,
          intro: params.intro,
          timestamp,
          count: reportFindings.length,
          productName: params.productName,
          buildId: params.buildId,
          buildInfo: params.buildInfo,
          severity: counts,
          sections,
        })
      : renderFindingsReport({
          title: params.title,
          intro: params.intro,
          timestamp,
          count: reportFindings.length,
          severity: counts,
          rows: this.buildReportRows(reportFindings, baseUrl),
        });

    const to = await this.resolveRecipients(params.productTypeId);

    await this.mailer.send({ to, subject: params.subject, html });

    return {
      totalFindings: reportFindings.length,
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
        product: getNested(f, 'related_fields.test.engagement.product.name'),
        engagement: getNested(f, 'related_fields.test.engagement.name'),
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
