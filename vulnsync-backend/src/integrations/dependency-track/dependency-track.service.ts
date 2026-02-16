// dependency-track.service.ts
import { DefectDojoClient } from '@/integrations/defectdojo/defectdojo.client';
import { DependencyTrackMappingsService } from '@/mappings/dependency-track-mapping.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import FormData from 'form-data';
import { DependencyTrackClient } from './dependency-track.client';

@Injectable()
export class DependencyTrackService {
  private readonly kevUrl =
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  private kevSyncRunning = false;
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

      const reportJson = JSON.parse(
        Buffer.isBuffer(report) ? report.toString() : report,
      );

      this.logger.log(
        `Findings exported from DependencyTrack: count=${reportJson.findings?.length ?? 0}`,
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
        filename: 'report.json',
        contentType: 'application/json',
      });

      await this.defectDojoClient.importScan(form);

      this.logger.log(
        `Findings successfully imported into DefectDojo: product=${defectDojoProduct.name}`,
      );

      return { status: 'IMPORTED' };
    } catch (error) {
      this.logger.error(
        `exportLatestProjectFindings failed: defectDojoProductId=${defectDojoProductId}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to export latest project findings',
      );
    }
  }

  async syncKevInBackground() {
    if (this.kevSyncRunning) {
      return { status: 'already_running' };
    }
    this.kevSyncRunning = true;

    setImmediate(async () => {
      try {
        await this.syncKevInternal();
      } catch (err) {
        this.logger.error('KEV sync failed', err?.status);
      } finally {
        this.kevSyncRunning = false;
      }
    });

    return {
      status: 'started',
      startedAt: new Date().toISOString(),
    };
  }

  private async syncKevInternal() {
    this.logger.log('KEV sync started');

    /** 1. Fetch KEV */
    const kev = await this.fetchKev();
    const kevCves = new Set(kev.map((v) => v.cveID));

    this.logger.log(`KEV CVEs: ${kevCves.size}`);

    if (!kevCves.size) return;

    /** 2. Create policy */
    const policy = await this.getOrCreateKevPolicy();

    const conditions = policy?.policyConditions;

    const existing = new Map<string, { uuid: string }>();

    for (const c of conditions) {
      if (c.subject === 'VULNERABILITY_ID') {
        existing.set(c.value, { uuid: c.uuid });
      }
    }

    const toAdd = [...kevCves].filter((cve) => !existing.has(cve));
    const toRemove = [...existing.keys()].filter((cve) => !kevCves.has(cve));

    this.logger.log(
      `KEV diff → add: ${toAdd.length}, remove: ${toRemove.length}`,
    );

    for (let i = 0; i < toAdd.length; i++) {
      const cve = toAdd[i];
      try {
        await this.depTrackClient.addPolicyCondition(policy.uuid, cve);

        if (i % 100 === 0) {
          this.logger.log(`KEV add progress: ${i}/${toAdd.length}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to add CVE ${cve}`, err?.status);
      }
      await this.sleep(100);
    }

    for (let i = 0; i < toRemove.length; i++) {
      const cve = toRemove[i];
      const condition = existing.get(cve);
      if (!condition) continue;

      try {
        await this.depTrackClient.deletePolicyCondition(
          policy.uuid,
          condition.uuid,
        );

        if (i % 100 === 0) {
          this.logger.log(`KEV remove progress: ${i}/${toRemove.length}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to remove CVE ${cve}`, err);
      }
      await this.sleep(20);
    }

    this.logger.log(
      `KEV sync finished. Added: ${toAdd.length}, removed: ${toRemove.length}`,
    );
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async fetchKev(): Promise<{ cveID: string }[]> {
    const res = await fetch(this.kevUrl);
    const json = await res.json();

    return json.vulnerabilities ?? [];
  }

  private async getOrCreateKevPolicy() {
    const policies = await this.depTrackClient.getPolicies();

    let kevPolicy = policies.find((p) => p.name === 'KEV');

    if (!kevPolicy) {
      this.logger.log('KEV policy not found, creating');

      kevPolicy = await this.depTrackClient.createPolicy('KEV');
    }

    return kevPolicy;
  }
}
