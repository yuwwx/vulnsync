// src/reports/report-templates.ts
// HTML-шаблоны отчётов (порт templates/report_success.html и templates/error.html
// из dd-pipeline-scripts). Стили инлайнятся напрямую - аналог premailer.transform().

const TD_STYLE = 'padding: 6px 8px; border: 1px solid #ccc;';
const TH_STYLE =
  'background: #525252; color: #fff; padding: 8px; text-align: left; border: 1px solid #ccc;';

const SEVERITY_STYLES: Record<string, string> = {
  Critical: 'background: #ffdddd; color: #a30000; font-weight: bold;',
  High: 'background: #ffe8cc; color: #b35900; font-weight: bold;',
  Medium: 'background: #fff9d6; color: #8a7d00;',
  Low: 'background: #e9f7e9; color: #2f662f;',
};

const SEVERITY_ACCENT_COLORS: Record<string, string> = {
  Critical: '#a30000',
  High: '#b35900',
  Medium: '#8a7d00',
  Low: '#2f662f',
};

export type FindingsReportRow = {
  id: string;
  findingUrl: string;
  productType: string;
  productName: string;
  engagement: string;
  testType: string;
  title: string;
  severity: string;
  cvssScore: string;
  created: string;
};

export type FindingsReportParams = {
  title: string;
  intro: string;
  timestamp: string;
  count: number;
  severity: { Critical: number; High: number; Medium: number; Low: number };
  rows: FindingsReportRow[];
};

// Элемент списка уязвимостей для отчёта по engagement (со описанием)
export type EngagementFindingItem = {
  id: string;
  findingUrl: string;
  title: string;
  severity: string;
  cvssScore: string;
  created: string;
  testType: string;
  description: string; // уже приведено к plain text
  location: string;
  lineNumber: string;
  mitigation: string;
  impact: string;
  stepsToReproduce: string;
  severityJustification: string;
  references: string;
};

// Дополнительные поля карточки, отображаются только если заполнены
const ENGAGEMENT_ITEM_DETAILS: Array<{
  key: Exclude<keyof EngagementFindingItem, 'id' | 'findingUrl'>;
  label: string;
}> = [
  { key: 'location', label: 'Location' },
  { key: 'lineNumber', label: 'Line Number' },
  { key: 'mitigation', label: 'Mitigation' },
  { key: 'impact', label: 'Impact' },
  { key: 'stepsToReproduce', label: 'Steps To Reproduce' },
  { key: 'severityJustification', label: 'Severity Justification' },
  { key: 'references', label: 'References' },
];

export type EngagementFindingsReportParams = {
  title: string;
  intro: string;
  timestamp: string;
  count: number;
  productName?: string; // Проект - в шапке письма, один раз
  engagementName?: string; // Сборка - в шапке письма, один раз
  severity: { Critical: number; High: number; Medium: number; Low: number };
  items: EngagementFindingItem[];
};

export type ErrorReportParams = {
  error: string;
  timestamp: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Приводит HTML-описание уязвимости из DefectDojo к читаемому plain text
export function htmlToPlainText(html: string): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(p|div|h[1-6])[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderFindingsReport(params: FindingsReportParams): string {
  const rowsHtml = params.rows
    .map((row, index) => {
      const rowStyle =
        index % 2 === 1 ? 'background: #f6f6f6;' : 'background: #fff;';
      const severityStyle = SEVERITY_STYLES[row.severity] ?? '';

      return `
        <tr style="${rowStyle}">
          <td style="${TD_STYLE}"><a href="${escapeHtml(row.findingUrl)}" target="_blank">${row.id}</a></td>
          <td style="${TD_STYLE}">${escapeHtml(row.productType)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.productName)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.engagement)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.testType)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.title)}</td>
          <td style="${TD_STYLE} ${severityStyle}">${escapeHtml(row.severity)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.cvssScore)}</td>
          <td style="${TD_STYLE}">${escapeHtml(row.created)}</td>
        </tr>`;
    })
    .join('');

  return `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: Arial, sans-serif; background: #f7f7f7; margin: 0; padding: 20px; color: #333;">
    <div style="background: #fff; padding: 20px 25px; border-radius: 8px; max-width: 800px; width: 100%; margin: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-left: 6px solid #525252;">
      <h2 style="color: #525252; margin-top: 0; margin-bottom: 10px;">${escapeHtml(params.title)}</h2>
      <div style="font-size: 13px; color: #777; margin-bottom: 20px;">Время формирования: ${escapeHtml(params.timestamp)}</div>
      <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        ${params.intro}<br />
        Сводка по критичности: Critical: <b>${params.severity.Critical}</b>, High:
        <b>${params.severity.High}</b>, Medium: <b>${params.severity.Medium}</b>, Low:
        <b>${params.severity.Low}</b>
      </p>
      <table style="border-collapse: collapse; width: 100%; max-width: 100%; table-layout: fixed; font-size: 13px;">
        <tr>
          <th style="${TH_STYLE}">ID</th>
          <th style="${TH_STYLE}">Product Type</th>
          <th style="${TH_STYLE}">Product</th>
          <th style="${TH_STYLE}">Engagement</th>
          <th style="${TH_STYLE}">Test</th>
          <th style="${TH_STYLE}">Название</th>
          <th style="${TH_STYLE}">Критичность</th>
          <th style="${TH_STYLE}">CVSS Score</th>
          <th style="${TH_STYLE}">Дата создания</th>
        </tr>
        ${rowsHtml}
      </table>
    </div>
  </body>
</html>`;
}

// Секция "label + текст" в карточке; пустые значения не выводятся
function renderDetailSection(label: string, value: string): string {
  if (!value?.trim()) {
    return '';
  }

  return `
            <div style="margin-top: 10px;">
              <div style="font-size: 12px; font-weight: bold; color: #525252; margin-bottom: 2px;">${escapeHtml(label)}</div>
              <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #444;">${escapeHtml(value)}</div>
            </div>`;
}

// Отчёт по engagement списком: одна уязвимость за другой, с описанием.
// Табличный renderFindingsReport оставлен без изменений для остальных отчётов.
export function renderEngagementFindingsReport(
  params: EngagementFindingsReportParams,
): string {
  const itemsHtml = params.items
    .map((item) => {
      const accent = SEVERITY_ACCENT_COLORS[item.severity] ?? '#ccc';
      const chipStyle = SEVERITY_STYLES[item.severity] ?? '';
      const severityHtml = item.severity
        ? `<span style="${chipStyle} padding: 2px 10px; border-radius: 12px; font-size: 12px; white-space: nowrap;">${escapeHtml(item.severity)}</span>`
        : '';
      const metaParts = [
        item.testType && `Тест: ${escapeHtml(item.testType)}`,
        item.cvssScore && `CVSS: ${escapeHtml(item.cvssScore)}`,
        item.created && `Создано: ${escapeHtml(item.created)}`,
      ].filter(Boolean);

      return `
        <div style="border: 1px solid #ddd; border-left: 4px solid ${accent}; border-radius: 6px; padding: 12px 15px; margin-bottom: 14px; background: #fff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            ${severityHtml}
            <a href="${escapeHtml(item.findingUrl)}" target="_blank" style="color: #525252; font-weight: bold; font-size: 14px; text-decoration: none;">#${escapeHtml(item.id)} ${escapeHtml(item.title)}</a>
          </div>
          ${metaParts.length ? `<div style="font-size: 12px; color: #777; margin-bottom: 8px;">${metaParts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
          <div style="margin-bottom: 4px;">
            <div style="font-size: 12px; font-weight: bold; color: #525252; margin-bottom: 2px;">Описание</div>
            <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #444; background: #fafafa; border-radius: 4px; padding: 10px 12px;">${escapeHtml(item.description || '—')}</div>
          </div>
          ${ENGAGEMENT_ITEM_DETAILS.map(({ key, label }) =>
            renderDetailSection(label, item[key]),
          ).join('')}
        </div>`;
    })
    .join('');

  return `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: Arial, sans-serif; background: #f7f7f7; margin: 0; padding: 20px; color: #333;">
    <div style="background: #fff; padding: 20px 25px; border-radius: 8px; max-width: 800px; width: 100%; margin: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-left: 6px solid #525252;">
      <h2 style="color: #525252; margin-top: 0; margin-bottom: 10px;">${escapeHtml(params.title)}</h2>
      <div style="font-size: 13px; color: #777; margin-bottom: 20px;">
        Время формирования: ${escapeHtml(params.timestamp)}${params.productName ? ` &nbsp;·&nbsp; Проект: ${escapeHtml(params.productName)}` : ''}${params.engagementName ? ` &nbsp;·&nbsp; Сборка: ${escapeHtml(params.engagementName)}` : ''} &nbsp;·&nbsp; Всего уязвимостей - <b>${params.count}</b>
      </div>
      <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        ${params.intro}<br />
        Сводка по критичности: Critical: <b>${params.severity.Critical}</b>, High:
        <b>${params.severity.High}</b>, Medium: <b>${params.severity.Medium}</b>, Low:
        <b>${params.severity.Low}</b>
      </p>
      ${itemsHtml}
    </div>
  </body>
</html>`;
}

export function renderErrorReport(params: ErrorReportParams): string {
  return `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: Arial, sans-serif; background: #f7f7f7; margin: 0; padding: 20px; color: #333;">
    <div style="background: #fff; padding: 20px 25px; border-radius: 8px; max-width: 800px; width: 100%; margin: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-left: 6px solid #d9534f;">
      <h2 style="color: #d9534f; margin-top: 0; margin-bottom: 10px;">Ошибка во время выполнения скрипта</h2>
      <div style="font-size: 13px; color: #777; margin-bottom: 10px;">Время выполнения: ${escapeHtml(params.timestamp)}</div>
      <p style="font-size: 15px; line-height: 1.5;">
        Во время выполнения скрипта произошла ошибка. Текст ошибки приведён
        ниже:
      </p>
      <div style="background: #f9e6e6; border: 1px solid #e4b5b5; border-radius: 6px; padding: 15px; margin-top: 15px; white-space: pre-wrap; font-family: Consolas, monospace; font-size: 13px; color: #a94442; overflow-x: auto;">${escapeHtml(params.error)}</div>
    </div>
  </body>
</html>`;
}
