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
