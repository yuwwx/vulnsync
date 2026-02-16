// src/integrations/defectdojo/defectdojo.client.ts
import { IntegrationType } from '@/common/enums/integration-type.enum';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class DefectDojoClient {
  private readonly logger = new Logger(DefectDojoClient.name);

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
      where: { type: IntegrationType.DEFECTDOJO },
    });

    if (!config) {
      this.logger.error('DefectDojo integration is not configured');
      throw new InternalServerErrorException(
        'DefectDojo integration is not configured',
      );
    }

    return axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Token ${config.apiToken}`,
      },
    });
  }

  async getProductTypes() {
    const client = await this.getClient();

    this.logger.log('Fetching DefectDojo product types');

    try {
      const { data } = await client.get('/api/v2/product_types/');

      if (!Array.isArray(data?.results)) {
        this.logger.error('Invalid product types response structure');
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (error) {
      throw this.logAxiosError(
        'Failed to fetch product types from DefectDojo',
        error,
      );
    }
  }

  async getProducts(productTypeId?: number) {
    const client = await this.getClient();

    this.logger.log(
      `Fetching DefectDojo products: productTypeId=${productTypeId ?? 'ALL'}`,
    );

    try {
      const { data } = await client.get('/api/v2/products/', {
        params: { prod_type: productTypeId },
      });

      if (!Array.isArray(data?.results)) {
        this.logger.error('Invalid products response structure');
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch products (productTypeId=${productTypeId})`,
        error,
      );
    }
  }

  async getProduct(productId: number) {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo product: productId=${productId}`);

    try {
      const { data } = await client.get(`/api/v2/products/${productId}`);

      if (!data) {
        this.logger.error(`Empty product response: productId=${productId}`);
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch product (productId=${productId})`,
        error,
      );
    }
  }

  async getFindingsByProduct(productId: number) {
    const client = await this.getClient();

    this.logger.log(
      `Fetching findings for DefectDojo product: productId=${productId}`,
    );

    try {
      const { data } = await client.get('/api/v2/findings/', {
        params: {
          test__engagement__product__prod_type: productId,
          limit: 1000,
          related_fields: true,
          active: true,
          o: '-date',
        },
      });

      if (!Array.isArray(data?.results)) {
        this.logger.error(
          `Invalid findings response structure: productId=${productId}`,
        );
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch findings for productId=${productId}`,
        error,
      );
    }
  }

  async getFinding(id: number) {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo finding: id=${id}`);

    try {
      const { data } = await client.get(`/api/v2/findings/${id}`, {
        params: { related_fields: true },
      });

      if (!data) {
        this.logger.error(`Empty finding response: id=${id}`);
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(`Failed to fetch finding (id=${id})`, error);
    }
  }

  async importScan(payload: any) {
    const client = await this.getClient();

    this.logger.log('Importing scan into DefectDojo');

    try {
      const { data } = await client.post('/api/v2/import-scan/', payload, {
        headers: {
          ...payload.getHeaders(),
        },
      });

      this.logger.log('Scan successfully imported into DefectDojo');

      return data;
    } catch (error) {
      throw this.logAxiosError('Failed to import scan into DefectDojo', error);
    }
  }
}
