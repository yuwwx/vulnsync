// defectdojo.service.ts
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoProductTypeDto } from './dto/defectdojo-product.dto';
import { DefectDojoFindingDto } from './dto/defectdojo-finding.dto';
import { DefectDojoProduct } from './types/defectdojo.types';

@Injectable()
export class DefectDojoService {
  constructor(private client: DefectDojoClient) {}

  async getProductTypes(): Promise<DefectDojoProductTypeDto[]> {
    const products = await this.client.getProductTypes();

    const productsArray = Array.isArray(products)
      ? products
      : products
        ? [products]
        : [];

    return plainToInstance(DefectDojoProductTypeDto, productsArray, {
      excludeExtraneousValues: true,
    });
  }

  async getProducts(
    productTypeId?: number,
  ): Promise<DefectDojoProductTypeDto[]> {
    const products = await this.client.getProducts(productTypeId);

    const productsArray = Array.isArray(products)
      ? products
      : products
        ? [products]
        : [];

    return plainToInstance(DefectDojoProductTypeDto, productsArray, {
      excludeExtraneousValues: true,
    });
  }

  async getProduct(productId: number): Promise<DefectDojoProduct> {
    const product = await this.client.getProduct(productId);

    return product;
  }

  async getFindingsByProduct(
    productId: number,
  ): Promise<DefectDojoFindingDto[]> {
    const findings = await this.client.getFindingsByProduct(productId);

    const findingsArray = Array.isArray(findings) ? findings : [findings];

    return plainToInstance(DefectDojoFindingDto, findingsArray, {
      excludeExtraneousValues: false,
    });
  }

  async getFinding(findingId: number): Promise<DefectDojoFindingDto> {
    const finding = await this.client.getFinding(findingId);

    return plainToInstance(DefectDojoFindingDto, finding, {
      excludeExtraneousValues: false,
    });
  }
}
