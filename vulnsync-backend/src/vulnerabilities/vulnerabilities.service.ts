// vulnerabilities.service.ts
import { DefectDojoService } from '@/integrations/defectdojo/defectdojo.service';
import { JiraDescriptionService } from '@/integrations/jira/jira-description.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { VulnerabilityListResponseDto } from './dto/vulnerability-list.dto';
import { plainToInstance } from 'class-transformer';

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

  async getVulnerabilities(
    productId: number,
    page = 1,
    limit = 10000,
    title?: string,
  ): Promise<VulnerabilityListResponseDto> {
    const offset = (page - 1) * limit;

    const findingsResponse = await this.defectDojo.getFindingsByProduct(
      productId,
      limit,
      offset,
      title,
    );

    const findings = findingsResponse.results;

    const externalIds = findings.map((f) => f.id.toString());

    const synced = await this.prisma.vulnerabilitySync.findMany({
      where: {
        externalId: { in: externalIds },
        source: 'DEFECTDOJO',
      },
    });

    const syncMap = new Map(synced.map((s) => [s.externalId, s]));

    return plainToInstance(VulnerabilityListResponseDto, {
      data: findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: syncMap.get(finding.id.toString())?.status ?? 'Не отправлена',
        cvssv3_score: finding.cvssv3_score,
        cvssv4_score: finding.cvssv4_score,
        creation_date: finding.date,
        product: finding?.related_fields?.test?.engagement?.product?.name,
        jiraIssueKey: syncMap.get(finding.id.toString())?.jiraIssueKey,
      })),

      pagination: {
        total: findingsResponse.count,
        page,
        limit,
        pages: Math.ceil(findingsResponse.count / limit),
      },
    });
  }

  async getJiraDescriptionPreview(findingIds: number[]) {
    const findings = await Promise.all(
      findingIds.map((id) => this.defectDojo.getFinding(id)),
    );
    if (findings.length === 1) {
      return {
        description:
          this.jiraDescriptionService.renderSingleFindingJiraDescription(
            findings[0],
          ),
      };
    }
    return {
      description:
        this.jiraDescriptionService.renderBulkFindingsJiraDescription(findings),
    };
  }
}
