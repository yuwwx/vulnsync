// defectdojo.client.ts
import axios, { AxiosInstance } from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IntegrationType } from '@/common/enums/integration-type.enum';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DefectDojoClient {
  private axios: AxiosInstance;

  constructor(private prisma: PrismaService) {}

  private async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.DEFECTDOJO },
    });

    if (!config) {
      throw new InternalServerErrorException(
        'DefectDojo integration not configured',
      );
    }

    if (!this.axios) {
      this.axios = axios.create({
        baseURL: config.baseUrl,
        headers: {
          Authorization: `Token ${config.apiToken}`,
        },
      });
    }

    return this.axios;
  }

  async getProducts() {
    const client = await this.getClient();
    const { data } = await client.get('/api/v2/products/');
    return data.results;
  }

  async getFindingsByProduct(productName: string) {
    const client = await this.getClient();
    const { data } = await client.get('/api/v2/findings/', {
      params: { product_name: productName },
    });
    return data.results;
  }

  async importScan(payload: any) {
    const client = await this.getClient();
    return client.post('/api/v2/import-scan/', payload);
  }
}
