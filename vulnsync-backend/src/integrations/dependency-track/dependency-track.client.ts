// dependency-track.client.ts
import axios, { AxiosInstance } from 'axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IntegrationType } from '@/common/enums/integration-type.enum';

@Injectable()
export class DependencyTrackClient {
  private readonly logger = new Logger(DependencyTrackClient.name);

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

  async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.DEPENDENCY_TRACK },
    });

    if (!config) {
      this.logger.error('Dependency-Track integration not configured');
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
    this.logger.log('Fetching Dependency-Track projects');

    try {
      const client = await this.getClient();
      const { data } = await client.get('/api/v1/project', {
        params: { excludeInactive: true },
      });
      return data;
    } catch (error) {
      throw this.logAxiosError('Dependency-Track getProjects failed', error);
    }
  }

  async getLatestProject(projectName: string) {
    this.logger.log(
      `Fetching latest Dependency-Track project: name=${projectName}`,
    );

    try {
      const client = await this.getClient();
      const { data } = await client.get(
        `/api/v1/project/latest/${projectName}`,
      );
      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track getLatestProject failed (name=${projectName})`,
        error,
      );
    }
  }

  async exportFindings(projectUuid: string) {
    this.logger.log(
      `Exporting Dependency-Track findings: projectUuid=${projectUuid}`,
    );

    try {
      const client = await this.getClient();
      const { data } = await client.get(
        `/api/v1/finding/project/${projectUuid}/export`,
        { responseType: 'arraybuffer' },
      );
      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track exportFindings failed (projectUuid=${projectUuid})`,
        error,
      );
    }
  }

  async createPolicy(name: string) {
    this.logger.log(`Creating Dependency-Track policy: name=${name}`);

    try {
      const client = await this.getClient();
      const { data } = await client.put('/api/v1/policy', {
        name,
        operator: 'ANY',
        violationState: 'WARN',
      });

      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track createPolicy failed (name=${name})`,
        error,
      );
    }
  }

  async getPolicies() {
    this.logger.log('Fetching Dependency-Track policies');

    try {
      const client = await this.getClient();
      const { data } = await client.get('/api/v1/policy');
      return data;
    } catch (error) {
      throw this.logAxiosError('Dependency-Track getPolicies failed', error);
    }
  }

  async getPolicy(policyUuid: string) {
    this.logger.log(`Fetching Dependency-Track policy: uuid=${policyUuid}`);

    try {
      const client = await this.getClient();
      const { data } = await client.get(`/api/v1/policy/${policyUuid}`);
      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track getPolicy failed (uuid=${policyUuid})`,
        error,
      );
    }
  }

  async addPolicyCondition(policyUuid: string, cve: string) {
    this.logger.log(
      `Adding policy condition: policyUuid=${policyUuid}, cve=${cve}`,
    );

    try {
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
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track addPolicyCondition failed (policyUuid=${policyUuid}, cve=${cve})`,
        error,
      );
    }
  }

  async deletePolicyCondition(policyUuid: string, conditionUuid: string) {
    this.logger.log(
      `Deleting policy condition: policyUuid=${policyUuid}, conditionUuid=${conditionUuid}`,
    );

    try {
      const client = await this.getClient();
      const { data } = await client.delete(
        `/api/v1/policy/${policyUuid}/condition/${conditionUuid}`,
      );

      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Dependency-Track deletePolicyCondition failed (policyUuid=${policyUuid}, conditionUuid=${conditionUuid})`,
        error,
      );
    }
  }
}
