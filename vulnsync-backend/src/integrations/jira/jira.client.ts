// jira.client.ts
import axios, { AxiosInstance } from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IntegrationType } from '@/common/enums/integration-type.enum';

@Injectable()
export class JiraClient {
  constructor(private prisma: PrismaService) {}

  private async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.JIRA },
    });

    if (!config) {
      throw new InternalServerErrorException('Jira integration not configured');
    }

    return axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createIssue(payload: any) {
    console.log('createIssue', payload);
    const client = await this.getClient();
    //const { data } = await client.post('/rest/api/2/issue', payload);
    const { data } = await client.post('/', payload);
    return data;
  }
}
