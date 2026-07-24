// defectdojo.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoFindingDto } from './dto/defectdojo-finding.dto';
import { DefectDojoProductTypeDto } from './dto/defectdojo-product.dto';
import { DefectDojoProduct } from './types/defectdojo.types';

@Injectable()
export class DefectDojoService {
  private readonly logger = new Logger(DefectDojoService.name);

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
    limit = 10000,
    offset = 0,
    title?: string,
  ) {
    const findingsResponse = await this.client.getFindingsByProduct(
      productId,
      limit,
      offset,
      title,
    );

    return {
      count: findingsResponse.count,
      results: plainToInstance(DefectDojoFindingDto, findingsResponse.results, {
        excludeExtraneousValues: false,
      }),
    };
  }

  async getFinding(findingId: number): Promise<DefectDojoFindingDto> {
    const finding = await this.client.getFinding(findingId);

    return plainToInstance(DefectDojoFindingDto, finding, {
      excludeExtraneousValues: false,
    });
  }

  async markFindingAsVerifiedAndTagged(
    findingId: number,
    jiraIssueKey: string,
  ): Promise<boolean> {
    try {
      await this.client.updateFinding(findingId, {
        verified: true,
        tags: [`#sym:${jiraIssueKey}`],
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(
        `Failed to mark DefectDojo finding ${findingId} as verified/tagged for Jira issue ${jiraIssueKey}: ${message}`,
      );

      return false;
    }
  }
}
