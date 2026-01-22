// src/utils/jira-description.ts

export type JiraDescriptionData = {
  title: string;
  products: string[];
  components: string[];
  vulnerabilityIds: string[];
  severity: string[];
  description: string[];
  links: string[];
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function formatVulnerabilityLinks(vulnIds: any[] = []) {
  return vulnIds
    .map((v) => {
      const id = v.vulnerability_id;
      if (id?.startsWith?.("CVE-")) {
        return `https://nvd.nist.gov/vuln/detail/${id}`;
      }
      if (id?.startsWith?.("GHSA-")) {
        return `https://github.com/advisories/${id}`;
      }
      return id;
    })
    .filter(Boolean);
}

export function normalizeSingleFinding(finding: any): JiraDescriptionData {
  const vulnIds = (finding.vulnerability_ids ?? []).map(
    (v: any) => v.vulnerability_id,
  );

  const severity = [
    finding.severity,
    finding.cvssv3_score && `CVSS ${finding.cvssv3_score}/10`,
    finding.cvssv3,
  ].filter(Boolean);

  return {
    title: finding.title ?? "—",
    products: [finding?.related_fields?.test?.engagement?.product?.name].filter(
      Boolean,
    ),
    components: [finding.file_path].filter(Boolean),
    vulnerabilityIds: vulnIds,
    severity,
    description: [finding.description].filter(Boolean),
    links: formatVulnerabilityLinks(finding.vulnerability_ids),
  };
}

export function normalizeBulkFindings(findings: any[]): JiraDescriptionData {
  const singles = findings.map(normalizeSingleFinding);

  return {
    title: uniq(singles.map((s) => s.title)).join(", "),
    products: uniq(singles.flatMap((s) => s.products)),
    components: uniq(singles.flatMap((s) => s.components)),
    vulnerabilityIds: uniq(singles.flatMap((s) => s.vulnerabilityIds)),
    severity: uniq(singles.flatMap((s) => s.severity)),
    description: uniq(singles.flatMap((s) => s.description)),
    links: uniq(singles.flatMap((s) => s.links)),
  };
}

export function renderJiraDescription(data: JiraDescriptionData): string {
  return `
*Название*
${data.title}
*Затронутые проекты*
${data.products.join(", ") || "—"}
*Уязвимые компоненты*
${data.components.join(", ") || "—"}
*Идентификаторы уязвимости*
${data.vulnerabilityIds.join(", ") || "—"}
*Критичность*
${data.severity.join(", ") || "—"}
*Описание*
${data.description.join("\n---\n") || "—"}
*Ссылки*
${data.links.join("\n") || "—"}
`.trim();
}
