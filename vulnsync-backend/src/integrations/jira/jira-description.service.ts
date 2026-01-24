import { Injectable } from '@nestjs/common';

export type JiraDescriptionData = {
  title: string;
  products: string[];
  components: string[];
  vulnerabilityIds: string[];
  severity: string[];
  description: string[];
  links: string[];
};

// jira-description.service.ts
@Injectable()
export class JiraDescriptionService {
  uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  formatVulnerabilityLinks(vulnIds: any[] = []) {
    return vulnIds
      .map((v) => {
        const id = v.vulnerability_id;
        if (id?.startsWith?.('CVE-')) {
          return `https://nvd.nist.gov/vuln/detail/${id}`;
        }
        if (id?.startsWith?.('GHSA-')) {
          return `https://github.com/advisories/${id}`;
        }
        return id;
      })
      .filter(Boolean);
  }

  normalizeSingleFinding(finding: any): JiraDescriptionData {
    const vulnIds = (finding.vulnerability_ids ?? []).map(
      (v: any) => v.vulnerability_id,
    );

    const severity = [
      finding.severity,
      finding.cvssv3_score && `CVSS ${finding.cvssv3_score}/10`,
      finding.cvssv3,
    ].filter(Boolean);

    return {
      title: finding.title ?? '—',
      products: [
        finding?.related_fields?.test?.engagement?.product?.name,
      ].filter(Boolean),
      components: [finding.file_path].filter(Boolean),
      vulnerabilityIds: vulnIds,
      severity,
      description: [finding.description].filter(Boolean),
      links: this.formatVulnerabilityLinks(finding.vulnerability_ids),
    };
  }

  normalizeBulkFindings(findings: any[]): JiraDescriptionData {
    const singles = findings.map((f) => this.normalizeSingleFinding(f));

    return {
      title: this.uniq(singles.map((s) => s.title)).join(', '),
      products: this.uniq(singles.flatMap((s) => s.products)),
      components: this.uniq(singles.flatMap((s) => s.components)),
      vulnerabilityIds: this.uniq(singles.flatMap((s) => s.vulnerabilityIds)),
      severity: this.uniq(singles.flatMap((s) => s.severity)),
      description: this.uniq(singles.flatMap((s) => s.description)),
      links: this.uniq(singles.flatMap((s) => s.links)),
    };
  }

  renderJiraDescription(data: JiraDescriptionData): string {
    return `
*Название*
${data.title}
*Затронутые проекты*
${data.products.join(', ') || '—'}
*Уязвимые компоненты*
${data.components.join(', ') || '—'}
*Идентификаторы уязвимости*
${data.vulnerabilityIds.join(', ') || '—'}
*Критичность*
${data.severity.join(', ') || '—'}
*Описание*
${data.description.join('\n---\n') || '—'}
*Ссылки*
${data.links.join('\n') || '—'}
`.trim();
  }
}
