// src/integrations/defectdojo/defectdojo.client.ts
import { IntegrationType } from '@/common/enums/integration-type.enum';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

type DefectDojoFindingsResponse = {
  count: number;
  results: unknown[];
};

type UpdateFindingPayload = {
  verified?: boolean;
  tags?: string[];
  severity?: string;
  active?: boolean;
  close_comment?: string;
};

type CloseFindingPayload = {
  is_mitigated: boolean;
  mitigated: string;
  false_p: boolean;
  out_of_scope: boolean;
  duplicate: boolean;
  mitigated_by: number | null;
  note: string;
  note_type: number | null;
};

type DefectDojoApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

type DefectDojoEngagement = {
  id: number;
  name?: string;
  product?: number;
  // контекст сборки (заполняется для CI/CD-engagement)
  version?: string;
  build_id?: string;
  branch_tag?: string;
};

@Injectable()
export class DefectDojoClient {
  private readonly logger = new Logger(DefectDojoClient.name);

  constructor(private prisma: PrismaService) {}

  private logAxiosError(
    message: string,
    error: unknown,
  ): InternalServerErrorException {
    const apiError = error as DefectDojoApiError;
    const responseMessage = JSON.stringify(
      apiError.response?.data || apiError.message,
    );

    this.logger.error(message, JSON.stringify(responseMessage));

    return new InternalServerErrorException(`${message}: ${responseMessage}`);
  }

  async getClient(): Promise<AxiosInstance> {
    const config = await this.getConfig();

    return axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Token ${config.apiToken}`,
      },
    });
  }

  async getConfig() {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.DEFECTDOJO },
    });

    if (!config) {
      this.logger.error('DefectDojo integration is not configured');
      throw new InternalServerErrorException(
        'DefectDojo integration is not configured',
      );
    }

    return config;
  }

  async getBaseUrl(): Promise<string> {
    const config = await this.getConfig();

    return config.baseUrl.replace(/\/+$/, '');
  }

  async getProductTypes() {
    const client = await this.getClient();

    this.logger.log('Fetching DefectDojo product types');

    try {
      const { data } = await client.get('/api/v2/product_types/', {
        params: { limit: 10000 },
      });

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
        params: { prod_type: productTypeId, limit: 10000 },
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

  async getEngagement(
    engagementId: number,
  ): Promise<DefectDojoEngagement | null> {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo engagement: id=${engagementId}`);

    try {
      const { data } = await client.get<DefectDojoEngagement | null>(
        `/api/v2/engagements/${engagementId}`,
      );

      if (!data) {
        this.logger.error(`Empty engagement response: id=${engagementId}`);
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch engagement (id=${engagementId})`,
        error,
      );
    }
  }

  async getFindingsByProduct(
    productId: number,
    limit = 10000,
    offset = 0,
    title?: string,
  ) {
    const client = await this.getClient();

    this.logger.log(
      `Fetching findings for DefectDojo product: productId=${productId}, limit=${limit}, offset=${offset}, title=${title}`,
    );

    try {
      const { data } = await client.get<DefectDojoFindingsResponse>(
        '/api/v2/findings/',
        {
          params: {
            test__engagement__product__prod_type: productId,
            limit,
            offset,
            related_fields: true,
            active: true,
            title: title,
            o: '-date',
          },
        },
      );

      if (!Array.isArray(data?.results)) {
        this.logger.error(
          `Invalid findings response structure: productId=${productId}`,
        );

        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
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

  async updateFinding(id: number, payload: UpdateFindingPayload) {
    const client = await this.getClient();

    this.logger.log(`Updating DefectDojo finding: id=${id}`);

    try {
      const { data } = await client.patch(`/api/v2/findings/${id}/`, payload);

      if (!data) {
        this.logger.error(`Empty update response: id=${id}`);
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(`Failed to update finding (id=${id})`, error);
    }
  }

  async closeFinding(id: number, payload: CloseFindingPayload) {
    const client = await this.getClient();

    this.logger.log(`Closing DefectDojo finding: id=${id}`);

    try {
      const { data } = await client.post(
        `/api/v2/findings/${id}/close/`,
        payload,
      );

      if (!data) {
        this.logger.error(`Empty close response: id=${id}`);
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(`Failed to close finding (id=${id})`, error);
    }
  }

  async importScan(payload: { getHeaders(): Record<string, string> }) {
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
