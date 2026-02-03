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

  private logAxiosError(
    message: string,
    error: any,
  ): InternalServerErrorException {
    const responseMessage = JSON.stringify(
      error.response?.data || error.message,
    );

    this.logger.error(message, JSON.stringify(responseMessage));

    return new InternalServerErrorException(`${message}: ${responseMessage}`);
  }

  private async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.JIRA },
    });

    if (!config) {
      this.logger.error('Jira integration not configured');
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
    this.logger.log('Creating Jira issue');

    try {
      const client = await this.getClient();
      const { data } = await client.post('/rest/api/2/issue', payload);

      this.logger.log(`Jira issue created: key=${data?.key}`);

      return data;
    } catch (error) {
      throw this.logAxiosError('Jira createIssue failed', error);
    }
  }

  async getIssue(key: string) {
    this.logger.log(`Fetching Jira issue: key=${key}`);

    try {
      const client = await this.getClient();
      const { data } = await client.get(`/rest/api/2/issue/${key}`);
      return data;
    } catch (error) {
      throw this.logAxiosError(`Jira getIssue failed (key=${key})`, error);
    }
  }

  async getProjects() {
    this.logger.log('Fetching Jira projects');

    try {
      const client = await this.getClient();
      const { data } = await client.get('/rest/api/2/project');
      return data;
    } catch (error) {
      throw this.logAxiosError('Jira getProjects failed', error);
    }
  }

  async getCustomFields() {
    this.logger.log('Fetching Jira custom fields');

    try {
      const client = await this.getClient();
      const { data } = await client.get('/rest/api/2/field');
      return data;
    } catch (error) {
      throw this.logAxiosError('Jira getCustomFields failed', error);
    }
  }
}
