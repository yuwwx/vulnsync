// dependency-track.service.ts
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { DependencyTrackMappingsService } from '@/mappings/dependency-track-mapping.service';
import { Injectable } from '@nestjs/common';
import { DependencyTrackClient } from './dependency-track.client';
import FormData from 'form-data';

@Injectable()
export class DependencyTrackService {
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
    const mapping =
      await this.dependencyTrack.getByProduct(defectDojoProductId);

    const latestProject = await this.depTrackClient.getLatestProject(
      mapping?.dtProjectName,
    );

    const defectDojoProduct =
      await this.defectDojoClient.getProduct(defectDojoProductId);

    const report = await this.depTrackClient.exportFindings(
      latestProject?.uuid,
    );
    const reportJson = JSON.parse(
      Buffer.isBuffer(report) ? report.toString() : report,
    );

    const order = ['NVD', 'GITHUB'];

    reportJson.findings.sort((a: any, b: any) => {
      const sa = a.vulnerability?.source;
      const sb = b.vulnerability?.source;

      const ia = order.indexOf(sa);
      const ib = order.indexOf(sb);

      const aRank = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const bRank = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;

      return aRank - bRank;
    });

    const filteredBuffer = Buffer.from(JSON.stringify(reportJson));

    const form = new FormData();
    form.append(
      'scan_type',
      'Dependency Track Finding Packaging Format (FPF) Export',
    );
    form.append('product_name', defectDojoProduct.name);
    form.append('engagement_name', latestProject?.version || 'default');
    form.append('auto_create_context', 'True');
    form.append('file', filteredBuffer, {
      filename: 'report.json', // имя файла
      contentType: 'application/json',
    });

    await this.defectDojoClient.importScan(form);

    return { status: 'IMPORTED' };
  }
}
