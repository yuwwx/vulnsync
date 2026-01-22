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
}
