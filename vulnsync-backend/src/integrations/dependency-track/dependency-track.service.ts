// dependency-track.service.ts
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { DependencyTrackMappingsService } from '@/mappings/dependency-track-mappings.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import FormData from 'form-data';
import { DependencyTrackClient } from './dependency-track.client';

type DependencyTrackFinding = {
  vulnerability?: {
    source?: string;
  };
  [key: string]: unknown;
};

type DependencyTrackReport = {
  findings?: DependencyTrackFinding[];
};

@Injectable()
export class DependencyTrackService {
  private readonly logger = new Logger(DependencyTrackService.name);

  constructor(
    private depTrackClient: DependencyTrackClient,
    private defectDojoClient: DefectDojoClient,
    private dependencyTrack: DependencyTrackMappingsService,
  ) {}

  async getProjects() {
    const projects = await this.depTrackClient.getProjects();

    return projects;
  }

  async exportLatestProjectFindings(defectDojoProductId: number) {
    this.logger.log(
      `Starting exportLatestProjectFindings: defectDojoProductId=${defectDojoProductId}`,
    );

    try {
      const mapping =
        await this.dependencyTrack.getByProduct(defectDojoProductId);

      if (!mapping?.dtProjectName) {
        this.logger.warn(
          `DependencyTrack mapping not found for defectDojoProductId=${defectDojoProductId}`,
        );
      }

      const latestProject = await this.depTrackClient.getLatestProject(
        mapping?.dtProjectName,
      );

      if (!latestProject?.uuid) {
        this.logger.warn(
          `Latest DependencyTrack project not found for product=${mapping?.dtProjectName}`,
        );
      }

      const defectDojoProduct =
        await this.defectDojoClient.getProduct(defectDojoProductId);

      const report = await this.depTrackClient.exportFindings(
        latestProject?.uuid,
      );

      const reportJson = this.parseReport(report);

      this.logger.log(
        `Findings exported from DependencyTrack: count=${reportJson.findings?.length ?? 0}`,
      );

      const findings = this.sortFindings(reportJson.findings ?? []);

      const filteredBuffer = Buffer.from(
        JSON.stringify({ ...reportJson, findings }),
      );

      const form = new FormData();
      form.append(
        'scan_type',
        'Dependency Track Finding Packaging Format (FPF) Export',
      );
      form.append('product_name', defectDojoProduct.name);
      form.append('engagement_name', latestProject?.version || 'default');
      form.append('auto_create_context', 'True');
      form.append('file', filteredBuffer, {
        filename: 'report.json',
        contentType: 'application/json',
      });

      await this.defectDojoClient.importScan(form);

      this.logger.log(
        `Findings successfully imported into DefectDojo: product=${defectDojoProduct.name}`,
      );

      return { status: 'IMPORTED' };
    } catch (error: unknown) {
      this.logger.error(
        `exportLatestProjectFindings failed: defectDojoProductId=${defectDojoProductId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        'Failed to export latest project findings',
      );
    }
  }

  private parseReport(report: unknown): DependencyTrackReport {
    const rawReport = Buffer.isBuffer(report) ? report.toString() : report;

    if (typeof rawReport === 'string') {
      return JSON.parse(rawReport) as DependencyTrackReport;
    }

    return rawReport as DependencyTrackReport;
  }

  private sortFindings(
    findings: DependencyTrackFinding[],
  ): DependencyTrackFinding[] {
    const sourceOrder = ['NVD', 'GITHUB'];

    return [...findings].sort((a, b) => {
      const aRank = this.getSourceRank(a.vulnerability?.source, sourceOrder);
      const bRank = this.getSourceRank(b.vulnerability?.source, sourceOrder);

      return aRank - bRank;
    });
  }

  private getSourceRank(source: string | undefined, sourceOrder: string[]) {
    const index = source ? sourceOrder.indexOf(source) : -1;

    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }
}
