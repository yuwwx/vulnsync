// src/integrations/defectdojo/defectdojo.client.ts
import { IntegrationType } from '@/common/enums/integration-type.enum';
import { PrismaService } from '@/prisma/prisma.service';
import {
  DefectDojoEngagement,
  DefectDojoProduct,
  DefectDojoProductType,
  DefectDojoTest,
  DefectDojoTestImport,
} from './types/defectdojo.types';
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
    const config = await this.prisma.integrationSetting.findUnique({
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

  async getProductTypes(): Promise<DefectDojoProductType[]> {
    const client = await this.getClient();

    this.logger.log('Fetching DefectDojo product types');

    try {
      const { data } = await client.get<{
        results?: DefectDojoProductType[];
      }>('/api/v2/product_types/', {
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

  async getProducts(productTypeId?: number): Promise<DefectDojoProduct[]> {
    const client = await this.getClient();

    this.logger.log(
      `Fetching DefectDojo products: productTypeId=${productTypeId ?? 'ALL'}`,
    );

    try {
      const { data } = await client.get<{ results?: DefectDojoProduct[] }>(
        '/api/v2/products/',
        {
          params: { prod_type: productTypeId, limit: 10000 },
        },
      );

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

  async getProduct(productId: number): Promise<DefectDojoProduct> {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo product: productId=${productId}`);

    try {
      const { data } = await client.get<DefectDojoProduct>(
        `/api/v2/products/${productId}`,
      );

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

  async getEngagements(productId: number): Promise<DefectDojoEngagement[]> {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo engagements: productId=${productId}`);

    try {
      const { data } = await client.get<{ results?: DefectDojoEngagement[] }>(
        '/api/v2/engagements/',
        {
          params: { product: productId, limit: 1000 },
        },
      );

      if (!Array.isArray(data?.results)) {
        this.logger.error('Invalid engagements response structure');
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch engagements (productId=${productId})`,
        error,
      );
    }
  }

  async getTests(engagementId: number): Promise<DefectDojoTest[]> {
    const client = await this.getClient();

    this.logger.log(`Fetching DefectDojo tests: engagementId=${engagementId}`);

    try {
      const { data } = await client.get<{ results?: DefectDojoTest[] }>(
        '/api/v2/tests/',
        {
          params: { engagement: engagementId, limit: 1000 },
        },
      );

      if (!Array.isArray(data?.results)) {
        this.logger.error('Invalid tests response structure');
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch tests (engagementId=${engagementId})`,
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

  // Универсальный запрос findings: фильтры уходят в DD API как есть,
  // например { test__engagement__product__prod_type: id } (тип продуктов)
  // или { test__engagement__product: id } (конкретный продукт).
  // o — поле сортировки DD (только из разрешённого списка ApiFindingFilter,
  // иначе DD молча игнорирует его и оставляет дефолт API: order_by(id))
  async getFindings(
    filters: Record<string, unknown>,
    limit = 10000,
    offset = 0,
    title?: string,
    o?: string,
  ) {
    const client = await this.getClient();

    this.logger.log(
      `Fetching DefectDojo findings: filters=${JSON.stringify(filters)}, limit=${limit}, offset=${offset}, title=${title}, o=${o}`,
    );

    try {
      const { data } = await client.get<DefectDojoFindingsResponse>(
        '/api/v2/findings/',
        {
          params: {
            ...filters,
            limit,
            offset,
            related_fields: true,
            active: true,
            title: title,
            ...(o ? { o } : {}),
          },
        },
      );

      if (!Array.isArray(data?.results)) {
        this.logger.error(
          `Invalid findings response structure: filters=${JSON.stringify(filters)}`,
        );

        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch findings: filters=${JSON.stringify(filters)}`,
        error,
      );
    }
  }

  // Разбивка активных findings по критичности одним запросом:
  // v3 include=counts отдаёт meta.counts.
  // asset — продукт, organization — группа продуктов (product type).
  // Без фильтра — по всем продуктам.
  async getSeverityCounts(filter?: {
    asset?: number;
    assets?: number[];
    organization?: number;
  }): Promise<{
    severity: Record<string, number>;
    total: number;
  }> {
    const client = await this.getClient();

    this.logger.log(
      `Fetching DefectDojo severity counts: ${JSON.stringify(filter ?? 'ALL')}`,
    );

    try {
      const params: Record<string, unknown> = {
        include: 'counts',
        active: true,
        limit: 1,
      };
      if (filter?.assets?.length) {
        params.asset__in = filter.assets.join(',');
      } else if (filter?.asset) {
        params.asset = filter.asset;
      }
      if (filter?.organization) {
        params.organization = filter.organization;
      }

      const { data } = await client.get<{
        meta?: {
          counts?: { severity?: Record<string, number>; total?: number };
        };
      }>('/api/v3/findings', { params });

      const counts = data?.meta?.counts ?? {};

      return {
        severity: counts.severity ?? {},
        total: counts.total ?? 0,
      };
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch severity counts (${JSON.stringify(filter ?? 'ALL')})`,
        error,
      );
    }
  }

  async getProductSeverityCounts(
    productId: number,
  ): Promise<Record<string, number>> {
    const { severity } = await this.getSeverityCounts({ asset: productId });

    return severity;
  }

  async getProductTypeSeverityCounts(
    productTypeId: number,
  ): Promise<Record<string, number>> {
    const { severity } = await this.getSeverityCounts({
      organization: productTypeId,
    });

    return severity;
  }

  // CSV-экспорт findings средствами DefectDojo v3: тот же набор фильтров,
  // что и у списка, но без пагинации (стриминг всего результата).
  async getFindingsCsv(filter: {
    organization?: number;
    asset?: number;
  }): Promise<Buffer> {
    const client = await this.getClient();

    const params: Record<string, unknown> = {
      // Как и в списке уязвимостей, выгружаем только активные findings.
      active: true,
    };
    if (filter.organization) {
      params.organization = filter.organization;
    }
    if (filter.asset) {
      params.asset = filter.asset;
    }

    this.logger.log(
      `Exporting DefectDojo findings CSV: ${JSON.stringify(filter)}`,
    );

    try {
      const { data } = await client.get<ArrayBuffer>(
        '/api/v3/findings/export.csv',
        { params, responseType: 'arraybuffer' },
      );

      return Buffer.from(data);
    } catch (error) {
      throw this.logAxiosError('Failed to export findings CSV', error);
    }
  }

  // История импортов скана для конкретного finding:
  // test_imports, содержащие действие (N/C/R/U) по этому finding.
  async getTestImportsForFinding(
    findingId: number,
  ): Promise<DefectDojoTestImport[]> {
    const client = await this.getClient();

    this.logger.log(
      `Fetching DefectDojo test imports: findingId=${findingId}`,
    );

    try {
      const { data } = await client.get<{ results?: DefectDojoTestImport[] }>(
        '/api/v2/test_imports/',
        {
          params: {
            test_import_finding_action__finding: findingId,
            o: '-id',
            limit: 100,
          },
        },
      );

      return Array.isArray(data?.results) ? data.results : [];
    } catch (error) {
      throw this.logAxiosError(
        `Failed to fetch test imports (findingId=${findingId})`,
        error,
      );
    }
  }

  // Количество продуктов (assets) — лёгкий count-запрос
  async getProductsCount(): Promise<number> {
    const client = await this.getClient();

    const { data } = await client.get<{ count?: number }>('/api/v2/products/', {
      params: { limit: 1 },
    });

    return data?.count ?? 0;
  }

  // Количество групп продуктов (product types) — лёгкий count-запрос
  async getProductTypesCount(): Promise<number> {
    const client = await this.getClient();

    const { data } = await client.get<{ count?: number }>(
      '/api/v2/product_types/',
      { params: { limit: 1 } },
    );

    return data?.count ?? 0;
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
