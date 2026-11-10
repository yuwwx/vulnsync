// defectdojo.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoFindingDto } from './dto/defectdojo-finding.dto';
import { DefectDojoProductTypeDto } from './dto/defectdojo-product.dto';
import {
  DefectDojoEngagementDto,
  DefectDojoTestDto,
} from './dto/defectdojo-scan.dto';
import { DefectDojoProduct } from './types/defectdojo.types';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;

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

  // Число активных findings по фильтру (лёгкий COUNT-запрос, limit=1)
  private async getFindingsCount(
    filters: Record<string, unknown>,
  ): Promise<number> {
    const response = await this.client.getFindings(filters, 1, 0);
    return response.count;
  }

  // Разбивка открытых уязвимостей продукта по критичности.
  // 5 лёгких COUNT-запросов (по одному на severity), без выкачивания findings.
  async getProductSeverityCounts(
    productId: number,
  ): Promise<Record<string, number>> {
    const entries = await Promise.all(
      SEVERITIES.map(async (severity) => {
        const count = await this.getFindingsCount({
          test__engagement__product: productId,
          severity,
        });
        return [severity, count] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  // Дерево сканирований продукта: engagements, внутри каждого — тесты
  async getProductScans(productId: number): Promise<DefectDojoEngagementDto[]> {
    const engagements = await this.client.getEngagements(productId);

    const engagementsArray = Array.isArray(engagements) ? engagements : [];

    return Promise.all(
      engagementsArray.map(async (engagement) => {
        const tests = await this.client.getTests(engagement.id);

        const engagementDto = plainToInstance(
          DefectDojoEngagementDto,
          engagement,
          { excludeExtraneousValues: true },
        );

        return {
          ...engagementDto,
          tests: plainToInstance(DefectDojoTestDto, tests, {
            excludeExtraneousValues: true,
          }),
        };
      }),
    );
  }

  async getFindings(
    filters: Record<string, unknown>,
    limit = 10000,
    offset = 0,
    title?: string,
    o?: string,
  ) {
    const findingsResponse = await this.client.getFindings(
      filters,
      limit,
      offset,
      title,
      o,
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
        tags: [`${jiraIssueKey}`],
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

  async changeFindingSeverity(findingId: number, severity: string) {
    const finding = await this.client.updateFinding(findingId, {
      severity,
      verified: true,
    });

    return finding;
  }

  async closeFinding(findingId: number, comment: string) {
    return this.client.closeFinding(findingId, {
      is_mitigated: true,
      mitigated: new Date().toISOString(),
      false_p: false,
      out_of_scope: false,
      duplicate: false,
      mitigated_by: null,
      note: comment,
      note_type: null,
    });
  }
}
