// dependency-track.client.ts
import axios, { AxiosInstance } from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IntegrationType } from '@/common/enums/integration-type.enum';

@Injectable()
export class DependencyTrackClient {
  constructor(private prisma: PrismaService) {}

  async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.DEPENDENCY_TRACK },
    });

    if (!config) {
      throw new InternalServerErrorException(
        'Dependency-Track integration not configured',
      );
    }

    return axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-Api-Key': config.apiToken,
      },
    });
  }

  async getProjects() {
    const client = await this.getClient();
    const { data } = await client.get('/api/v1/project', {
      params: { excludeInactive: true },
    });
    return data;
  }

  async getLatestProject(projectName: string) {
    const client = await this.getClient();
    const { data } = await client.get(`/api/v1/project/latest/${projectName}`);
    return data;
  }

  async exportFindings(projectUuid: string) {
    const client = await this.getClient();
    const { data } = await client.get(
      `/api/v1/finding/project/${projectUuid}/export`,
      { responseType: 'arraybuffer' },
    );
    return data;
  }

  async createPolicy(name: string) {
    const client = await this.getClient();
    const { data } = await client.put('/api/v1/policy', {
      name,
      operator: 'ANY',
      violationState: 'WARN',
    });

    return data;
  }

  async getPolicies() {
    const client = await this.getClient();
    const { data } = await client.get('/api/v1/policy');
    return data;
  }

  async getPolicy(policyUuid: string) {
    const client = await this.getClient();
    const { data } = await client.get(`/api/v1/policy/${policyUuid}`);
    return data;
  }

  async addPolicyCondition(policyUuid: string, cve: string) {
    const client = await this.getClient();
    const { data } = await client.put(
      `/api/v1/policy/${policyUuid}/condition`,
      {
        operator: 'IS',
        subject: 'VULNERABILITY_ID',
        value: cve,
      },
    );

    return data;
  }

  async deletePolicyCondition(policyUuid: string, conditionUuid: string) {
    const client = await this.getClient();
    await client.delete(
      `/api/v1/policy/${policyUuid}/condition/${conditionUuid}`,
    );
  }
}
