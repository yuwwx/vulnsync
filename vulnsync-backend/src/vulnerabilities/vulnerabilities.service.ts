import { DefectDojoService } from '@/integrations/defectdojo/defectdojo.service';
import { JiraDescriptionService } from '@/integrations/jira/jira-description.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VulnerabilitiesService {
  constructor(
    private prisma: PrismaService,
    private defectDojo: DefectDojoService,
    private jiraDescriptionService: JiraDescriptionService,
  ) {}

  async getProductTypes() {
    return this.defectDojo.getProductTypes();
  }

  async getVulnerabilities(productId: number) {
    const findings = await this.defectDojo.getFindingsByProduct(productId);

    const externalIds = findings.map((f) => f.id.toString());

    const synced = await this.prisma.vulnerabilitySync.findMany({
      where: {
        externalId: { in: externalIds },
        source: 'DEFECTDOJO',
      },
    });

    const syncMap = new Map(synced.map((s) => [s.externalId, s]));

    return findings.map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      status: syncMap.get(finding.id.toString())?.status ?? 'Не отправлена',
      cvssv3_score: finding.cvssv3_score,
      creation_date: finding.date,
      product: finding?.related_fields?.test?.engagement?.product?.name,
      jiraIssueKey: syncMap.get(finding.id.toString())?.jiraIssueKey,
    }));
  }

  async getJiraDescriptionPreview(findingIds: number[]) {
    const findings = await Promise.all(
      findingIds.map((id) => this.defectDojo.getFinding(id)),
    );
    if (findings.length === 1) {
      const data = this.jiraDescriptionService.normalizeSingleFinding(
        findings[0],
      );
      return {
        description: this.jiraDescriptionService.renderJiraDescription(data),
      };
    }
    const data = this.jiraDescriptionService.normalizeBulkFindings(findings);
    return {
      description: this.jiraDescriptionService.renderJiraDescription(data),
    };
  }
}
