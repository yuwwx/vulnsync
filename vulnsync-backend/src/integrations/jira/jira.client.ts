// jira.client.ts
import axios, { AxiosInstance } from 'axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IntegrationType } from '@/common/enums/integration-type.enum';
import https from 'https';

@Injectable()
export class JiraClient {
  private readonly logger = new Logger(JiraClient.name);

  constructor(private prisma: PrismaService) {}

  private async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.JIRA },
    });

    if (!config) {
      throw new InternalServerErrorException('Jira integration not configured');
    }

    const auth = Buffer.from(`${config.username}:${config.password}`).toString(
      'base64',
    );

    return axios.create({
      baseURL: config.baseUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createIssue(payload: any) {
    try {
      const client = await this.getClient();
      const { data } = await client.post('/rest/api/2/issue', payload);
      return data;
    } catch (error) {
      this.logger.error(
        'Jira createIssue failed',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException(
        'Jira API error while creating issue',
      );
    }
  }

  async getIssue(key: string) {
    try {
      const client = await this.getClient();
      const { data } = await client.get(`/rest/api/2/issue/${key}`);
      return data;
    } catch (error) {
      this.logger.error(
        'Jira createIssue failed',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException('Jira API error while get issue');
    }
  }

  async getProjects() {
    try {
      const client = await this.getClient();
      const { data } = await client.get('/rest/api/2/project');
      return data;
    } catch (error) {
      this.logger.error(
        'Jira createIssue failed',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException(
        'Jira API error while get projects',
      );
    }
  }

  async getCustomFields() {
    try {
      const client = await this.getClient();
      const { data } = await client.get('/rest/api/2/field');
      return data;
    } catch (error) {
      this.logger.error(
        'Jira createIssue failed',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException(
        'Jira API error while custom fields',
      );
    }
  }
}
