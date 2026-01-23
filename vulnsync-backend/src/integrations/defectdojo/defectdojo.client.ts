// src/integrations/defectdojo/defectdojo.client.ts
import axios, { AxiosInstance } from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IntegrationType } from '@/common/enums/integration-type.enum';
import { PrismaService } from '@/prisma/prisma.service';

interface DojoProduct {
  id: number;
  name: string;
  description: string;
  // другие поля по необходимости
}

interface DojoFinding {
  id: number;
  title: string;
  severity: string;
  description: string;
  // другие поля по необходимости
}

@Injectable()
export class DefectDojoClient {
  constructor(private prisma: PrismaService) {}

  async getClient(): Promise<AxiosInstance> {
    const config = await this.prisma.integrationSetting.findFirst({
      where: { type: IntegrationType.DEFECTDOJO },
    });

    if (!config) {
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

  async getProductTypes(): Promise<DojoProduct[]> {
    const client = await this.getClient();

    try {
      const { data } = await client.get('/api/v2/product_types/');
      if (!data || !Array.isArray(data.results)) {
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }
      return data.results;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Failed to fetch products from DefectDojo: ${err.message || err}`,
      );
    }
  }

  async getProducts(productTypeId?: number): Promise<DojoProduct[]> {
    const client = await this.getClient();

    try {
      const { data } = await client.get('/api/v2/products/', {
        params: {
          prod_type: productTypeId,
        },
      });

      if (!data || !Array.isArray(data.results)) {
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Failed to fetch products from DefectDojo: ${err}`,
      );
    }
  }

  async getProduct(productId?: number): Promise<DojoProduct> {
    const client = await this.getClient();

    try {
      const { data } = await client.get(`/api/v2/products/${productId}`);

      if (!data) {
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Failed to fetch products from DefectDojo: ${err.message || err}`,
      );
    }
  }

  async getFindingsByProduct(productId: number): Promise<DojoFinding[]> {
    const client = await this.getClient();

    try {
      const { data } = await client.get('/api/v2/findings/', {
        params: {
          test__engagement__product__prod_type: productId,
          limit: 1000,
          related_fields: true,
          active: true,
        },
      });

      if (!data || !Array.isArray(data.results)) {
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }

      return data.results;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Failed to fetch findings for product "${productId}": ${err.message || err}`,
      );
    }
  }

  async getFinding(id: number): Promise<DojoFinding> {
    const client = await this.getClient();

    try {
      const { data } = await client.get(`/api/v2/findings/${id}`, {
        params: { related_fields: true },
      });
      if (!data) {
        throw new InternalServerErrorException(
          'Invalid response from DefectDojo API',
        );
      }
      return data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Failed to fetch finding from DefectDojo: ${err.message || err}`,
      );
    }
  }

  async importScan(payload: any): Promise<any> {
    const client = await this.getClient();

    try {
      const { data } = await client.post('/api/v2/import-scan/', payload, {
        headers: {
          ...payload.getHeaders(),
        },
      });

      return data;
    } catch (err: any) {
      console.log(err);
      throw new InternalServerErrorException(
        `Failed to import scan into DefectDojo: ${err.message || err}`,
      );
    }
  }
}
