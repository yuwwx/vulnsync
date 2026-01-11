// jira.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JiraClient } from './jira.client';
import { VulnerabilitiesService } from '@/vulnerabilities/vulnerabilities.service';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class JiraService {
  constructor(
    private prisma: PrismaService,
    private jiraClient: JiraClient,
    private vulnerabilitiesService: VulnerabilitiesService,
    private logs: LogsService,
  ) {}

  async createIssue(findingId: number, productType: string, userId: string) {
    const mapping = await this.prisma.jiraMapping.findFirst({
      where: { productType },
    });

    if (!mapping) {
      throw new BadRequestException(
        `No Jira mapping for product type ${productType}`,
      );
    }

    const payload = {
      fields: {
        project: { key: mapping.projectKey },
        issuetype: { name: mapping.issueType },
        ...((mapping.fields as Record<string, any>) ?? {}),
      },
    };

    const issue = await this.jiraClient.createIssue(payload);

    await this.vulnerabilitiesService.markAsSent(findingId, issue.key, userId);

    return {
      issueKey: issue.key,
      issueUrl: `${mapping.projectKey}/browse/${issue.key}`,
    };
  }
}
