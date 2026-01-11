// vulnerabilities.service.ts
import { Injectable } from '@nestjs/common';
import { SyncStatus } from './enums/sync-status.enum';
import { VulnerabilityDto } from './dto/vulnerability.dto';
import { LogsService } from '@/logs/logs.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DefectDojoService } from '@/integrations/defectdojo/defectdojo.service';

@Injectable()
export class VulnerabilitiesService {
  constructor(
    private prisma: PrismaService,
    private defectDojo: DefectDojoService,
    private logs: LogsService,
  ) {}

  async getProducts(userId: string) {
    return this.defectDojo.getProducts(userId);
  }

  async getVulnerabilities(productName: string, userId: string) {
    const findings = await this.defectDojo.getFindings(productName, userId);

    const externalIds = findings.map((f) => f.id.toString());

    const synced = await this.prisma.vulnerabilitySync.findMany({
      where: {
        externalId: { in: externalIds },
        source: 'DEFECTDOJO',
      },
    });

    const syncMap = new Map(synced.map((s) => [s.externalId, s]));

    const result: VulnerabilityDto[] = findings.map((finding) => {
      const sync = syncMap.get(finding.id.toString());

      return {
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        description: finding.description,
        status: sync ? (sync.status as SyncStatus) : SyncStatus.NOT_SENT,
        jiraIssueKey: sync?.jiraIssueKey ?? undefined,
      };
    });

    await this.logs.log('GET_VULNERABILITIES', userId, { productName });

    return result;
  }

  async markAsSent(findingId: number, jiraIssueKey: string, userId: string) {
    await this.prisma.vulnerabilitySync.upsert({
      where: {
        externalId_source: {
          externalId: findingId.toString(),
          source: 'DEFECTDOJO',
        },
      },
      update: {
        status: SyncStatus.SENT,
        jiraIssueKey,
      },
      create: {
        externalId: findingId.toString(),
        source: 'DEFECTDOJO',
        status: SyncStatus.SENT,
        jiraIssueKey,
      },
    });

    await this.logs.log('VULNERABILITY_SENT_TO_JIRA', userId, {
      findingId,
      jiraIssueKey,
    });
  }
}
