import { Injectable } from '@nestjs/common';

export type JiraDescriptionData = {
  title: string;
  products: string[];
  components: string[];
  vulnerabilityIds: string[];
  severity: string[];
  description?: string[];
  links?: string[];
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

  renderSingleFindingJiraDescription(finding: any): string {
    const vulnIds = (finding.vulnerability_ids ?? []).map(
      (v: any) => v.vulnerability_id,
    );

    console.log(vulnIds);

    const severity = [
      finding.severity,
      finding.cvssv4_score && `CVSSv4 Score ${finding.cvssv4_score}/10`,
      finding.cvssv4,
      finding.cvssv3_score && `CVSSv3 Score ${finding.cvssv3_score}/10`,
      finding.cvssv3,
    ].filter(Boolean);

    const parts = [
      `*Название*\n${finding.title ?? '—'}`,
      `*Продукт / Сборка / Сканирование*\n${finding?.related_fields?.test?.engagement?.product?.name ?? '—'} / ${finding?.related_fields?.test?.engagement?.name ?? '—'} / ${finding?.related_fields?.test?.test_type?.name ?? '—'}`,
      `*Уязвимые компоненты*\n${[finding.file_path]?.filter(Boolean)?.join(', ') || '—'}`,
      `*Идентификаторы уязвимости*\n${vulnIds?.join(', ') || '—'}`,
      `*Критичность*\n${severity?.join(', ') || '—'}`,
    ];

    const links = this.formatVulnerabilityLinks(finding.vulnerability_ids);

    if ([finding.description].filter(Boolean)?.length) {
      parts.push(
        `*Описание*\n${[finding.description].filter(Boolean).join('\n---\n')}`,
      );
    }

    if (links?.length) {
      parts.push(`*Ссылки*\n${links.join('\n')}`);
    }

    return parts.join('\n\n');
  }

  buildBulkFindingsSummary(findings: any[]): string {
    if (!findings.length) {
      return '';
    }

    const groupedNames = Object.values(
      findings.reduce<Record<string, any[]>>((acc, finding) => {
        const componentName = finding.component_name ?? '—';
        const componentVersion = finding.component_version ?? '';
        const key = componentVersion
          ? `${componentName}:${componentVersion}`
          : componentName;

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(finding);

        return acc;
      }, {}),
    ).map((group) => {
      const firstFinding = group[0];
      const componentName = firstFinding.component_name ?? '—';
      const componentVersion = firstFinding.component_version ?? '';
      const affectedByItems = this.uniq(
        group.flatMap((finding) => {
          const title = finding.title?.trim() ?? '';
          if (!title) {
            return [];
          }

          const cleanedTitle = title
            .replace(/^\s*[^\s]+:\S+\s+Affected By:\s*/i, '')
            .trim();

          return cleanedTitle ? [cleanedTitle] : [];
        }),
      );

      const componentLabel = componentVersion
        ? `${componentName}:${componentVersion}`
        : componentName;
      const affectedBy = affectedByItems.join(', ');

      if (!affectedBy) {
        return componentLabel;
      }

      if (componentName === '—' && !componentVersion) {
        return affectedBy;
      }

      return `${componentLabel} Affected By: ${affectedBy}`;
    });

    const joinedName = groupedNames.join(', ');

    return joinedName.length > 254
      ? `${joinedName.slice(0, 251)}...`
      : joinedName;
  }

  renderBulkFindingsJiraDescription(findings: any[]): string {
    if (!findings.length) {
      return '';
    }

    const groupName = this.buildBulkFindingsSummary(findings);

    const severityOrder = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    const groupSeverity = findings.sort(
      (a, b) =>
        (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0),
    )[0].severity;

    const vulnerabilities = findings
      .map((f) => {
        return `|${f.title || '—'}|${f.related_fields?.test?.engagement?.product?.name ?? '—'}|${f.component_name || '—'}|${f.component_version || '—'}|${f.vulnerability_ids?.map((v) => v.vulnerability_id).join(', ') || '—'}|${f.severity || '—'}|`;
      })
      .join('\n');

    const descriptions = findings
      .map((f) => {
        const severity = [
          f.severity,
          f.cvssv4_score && `CVSSv4 Score ${f.cvssv4_score}/10`,
          f.cvssv4,
          f.cvssv3_score && `CVSSv3 Score ${f.cvssv3_score}/10`,
          f.cvssv3,
        ].filter(Boolean);

        return `
h3. ${f.title}

*Продукт / Сборка / Сканирование*
${f.related_fields?.test?.engagement?.product?.name ?? '—'} / ${f.related_fields?.test?.engagement?.name ?? '—'} / ${f.related_fields?.test?.test_type?.name ?? '—'}

*Уязвимые компоненты*
${f.component_name || '—'} ${f.component_version || '—'}

*Идентификатор уязвимости*
${f.vulnerability_ids?.map((v) => v.vulnerability_id).join(', ') || '—'}

*Критичность*
${severity.join(', ') || '—'}

*Ветка / Тег*
${f.related_fields?.test?.engagement?.branch_tag ?? '—'}

*Хэш коммита*
${f.related_fields?.test?.engagement?.commit_hash ?? '—'}

*Исходный файл*
${f.file_path ?? '—'}
        `.trim();
      })
      .join('\n\n');

    return `
*Группа уязвимостей*

${groupName}


*Уровень критичности*

${groupSeverity}


*Уязвимости*

||Название||Продукт||Компонент||Версия||Идентификатор уязвимости||Уровень критичности||
${vulnerabilities}


h2. Описание уязвимостей

${descriptions}
`.trim();
  }
}
