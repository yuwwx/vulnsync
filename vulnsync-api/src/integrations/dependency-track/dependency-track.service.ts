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
      await this.dependencyTrack.getByProductType(defectDojoProductId);

    const latestProject = await this.depTrackClient.getLatestProject(
      mapping?.dtProjectName,
    );

    const report = await this.depTrackClient.exportFindings(
      latestProject?.uuid,
    );

    // --- ВАЖНО: report должен быть Buffer или Stream
    // если report это string, делаем Buffer:
    const reportBuffer = Buffer.from(report);

    const form = new FormData();
    form.append('scan_type', 'Dependency-Track Findings Import');
    form.append('product_name', defectDojoProductId);
    form.append('engagement_name', latestProject?.version || 'default');
    form.append('file', reportBuffer, {
      filename: 'report.json', // имя файла
      contentType: 'application/json',
    });

    const ddResponse = await this.defectDojoClient.importScan(form);

    return { status: 'IMPORTED' };
  }
}
