// jira.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JiraClient } from './jira.client';
import { VulnerabilitiesService } from '@/vulnerabilities/vulnerabilities.service';
import { DefectDojoClient } from '../defectdojo/defectdojo.client';

@Injectable()
export class JiraService {
  constructor(
    private prisma: PrismaService,
    private jiraClient: JiraClient,
    private vulnerabilitiesService: VulnerabilitiesService,
    private defectDojoClient: DefectDojoClient,
  ) {}

  async createIssue(
    findingId: number,
    ddProductTypeId: number,
    userId: string,
  ) {
    const mapping = await this.prisma.jiraMapping.findFirst({
      where: { ddProductTypeId },
    });

    if (!mapping) {
      throw new BadRequestException(
        `No Jira mapping for product id ${ddProductTypeId}`,
      );
    }

    const finding = await this.defectDojoClient.getFinding(findingId);

    console.log(finding);

    const payload = {
      fields: {
        ...((mapping.fields as Record<string, any>) ?? {}),
        summary: finding?.title,
        description: finding.description,
      },
    };

    const issue = await this.jiraClient.createIssue(payload);

    await this.vulnerabilitiesService.markAsSent(findingId, issue.key, userId);

    return {
      issueKey: issue.key,
    };
  }
}
