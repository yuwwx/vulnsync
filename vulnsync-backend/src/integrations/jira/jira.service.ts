// jira.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JiraClient } from './jira.client';
import { VulnerabilitiesService } from '@/vulnerabilities/vulnerabilities.service';

@Injectable()
export class JiraService {
  constructor(
    private prisma: PrismaService,
    private jiraClient: JiraClient,
    private vulnerabilitiesService: VulnerabilitiesService,
  ) {}

  async createIssue(findingId: number, productId: number, userId: string) {
    const mapping = await this.prisma.jiraMapping.findFirst({
      where: { ddProductTypeId: productId },
    });

    if (!mapping) {
      throw new BadRequestException(
        `No Jira mapping for product id ${productId}`,
      );
    }

    const payload = {
      fields: {
        ...((mapping.fields as Record<string, any>) ?? {}),
      },
    };

    const issue = await this.jiraClient.createIssue(payload);

    await this.vulnerabilitiesService.markAsSent(findingId, issue.key, userId);

    return {
      issueKey: issue.key,
    };
  }
}
