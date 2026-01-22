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

    // 1) отделяем те, что можно дедуплицировать
    const dedupable = reportJson.findings.filter((f: any) => {
      return (f.vulnerability?.aliases || []).length > 0 && !!f.component?.uuid;
    });

    const notDedupable = reportJson.findings.filter((f: any) => {
      return !(
        (f.vulnerability?.aliases || []).length > 0 && !!f.component?.uuid
      );
    });

    // 2) дедупликация
    const map = new Map<string, any>();

    for (const f of dedupable) {
      const compKey = f.component.uuid;

      const aliases = f.vulnerability.aliases;
      const cve = aliases.find((a: any) => a.cveId)?.cveId;
      const ghsa = aliases.find((a: any) => a.ghsaId)?.ghsaId;

      const vulnKey = cve || ghsa;
      const key = `${compKey}::${vulnKey}`;

      if (!map.has(key)) {
        map.set(key, f);
        continue;
      }

      const existing = map.get(key);

      if (existing.vulnerability?.source === 'NVD') continue;

      if (f.vulnerability?.source === 'NVD') {
        map.set(key, f);
      }
    }

    // 3) собираем финальный report
    reportJson.findings = [
      ...Array.from(map.values()), // deduped
      ...notDedupable, // untouched
    ];

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
