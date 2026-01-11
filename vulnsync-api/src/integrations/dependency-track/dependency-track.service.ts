// dependency-track.service.ts
import { Injectable } from '@nestjs/common';
import { DependencyTrackClient } from './dependency-track.client';
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class DependencyTrackService {
  constructor(
    private depTrackClient: DependencyTrackClient,
    private defectDojoClient: DefectDojoClient,
    private logs: LogsService,
  ) {}

  async getProjects(userId: string) {
    const projects = await this.depTrackClient.getProjects();

    await this.logs.log('DEPTRACK_GET_PROJECTS', userId);

    return projects;
  }

  async importProjectFindings(
    projectUuid: string,
    defectDojoProductId: number,
    userId: string,
  ) {
    const report = await this.depTrackClient.exportFindings(projectUuid);

    const payload = {
      scan_type: 'Dependency-Track Findings Import',
      product: defectDojoProductId,
      engagement: null,
      minimum_severity: 'Low',
      active: true,
      verified: true,
      file: report,
    };

    await this.defectDojoClient.importScan(payload);

    await this.logs.log('DEPTRACK_IMPORTED_TO_DEFECTDOJO', userId, undefined, {
      projectUuid,
      defectDojoProductId,
    });

    return { status: 'IMPORTED' };
  }
}
