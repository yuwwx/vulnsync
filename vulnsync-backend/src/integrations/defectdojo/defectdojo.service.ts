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
    allowedProductTypeIds: number[] | null = null,
  ): Promise<DefectDojoProductTypeDto[]> {
    const products = await this.client.getProducts(productTypeId);

    const productsArray = Array.isArray(products)
      ? products
      : products
        ? [products]
        : [];

    // Для ограниченного пользователя при запросе всех продуктов
    // оставляем только продукты из разрешённых групп.
    const scopedProducts =
      allowedProductTypeIds === null
        ? productsArray
        : productsArray.filter((product) =>
            allowedProductTypeIds.includes(Number(product.prod_type)),
          );

    return plainToInstance(DefectDojoProductTypeDto, scopedProducts, {
      excludeExtraneousValues: true,
    });
  }

  // Тип продукта по finding: related_fields приходит при
  // related_fields=true и содержит product.prod_type = { id, name }.
  getFindingProductTypeId(finding: unknown): number | undefined {
    return this.toId(
      this.getNested(
        finding,
        'related_fields.test.engagement.product.prod_type',
      ),
    );
  }

  // История импортов для finding (доступность проверяет вызывающий слой).
  async getFindingTestImports(findingId: number) {
    return this.client.getTestImportsForFinding(findingId);
  }

  private getNested(value: unknown, path: string): unknown {
    let current = value;

    for (const key of path.split('.')) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private toId(value: unknown): number | undefined {
    if (value && typeof value === 'object') {
      return this.toId((value as Record<string, unknown>).id);
    }

    const id = Number(value);

    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  async getProduct(productId: number): Promise<DefectDojoProduct> {
    const product = await this.client.getProduct(productId);

    return product;
  }

  // Разбивка открытых уязвимостей продукта по критичности —
  // одним запросом к v3 (meta.counts.severity)
  async getProductSeverityCounts(
    productId: number,
  ): Promise<Record<string, number>> {
    return this.client.getProductSeverityCounts(productId);
  }

  // Разбивка по критичности для группы продуктов (product type)
  async getProductTypeSeverityCounts(
    productTypeId: number,
  ): Promise<Record<string, number>> {
    return this.client.getProductTypeSeverityCounts(productTypeId);
  }

  // Данные для дашборда: группы продуктов, продукты и разбивка по критичности.
  // Для ограниченного пользователя считаем только по разрешённым группам.
  async getDashboard(allowedProductTypeIds: number[] | null = null) {
    if (allowedProductTypeIds !== null) {
      return this.getScopedDashboard(allowedProductTypeIds);
    }

    const [productTypes, products, severity] = await Promise.all([
      this.client.getProductTypesCount(),
      this.client.getProductsCount(),
      this.client.getSeverityCounts(),
    ]);

    return {
      productTypes,
      products,
      severity: severity.severity,
      totalFindings: severity.total,
    };
  }

  private async getScopedDashboard(allowedProductTypeIds: number[]) {
    const empty = {
      productTypes: 0,
      products: 0,
      severity: {},
      totalFindings: 0,
    };

    if (allowedProductTypeIds.length === 0) {
      return empty;
    }

    const products = await this.getProducts(undefined, allowedProductTypeIds);
    const assetIds = products.map((product) => product.id);

    if (assetIds.length === 0) {
      return { ...empty, productTypes: allowedProductTypeIds.length };
    }

    // v3 не умеет organization__in, но умеет asset__in, поэтому severity
    // по всем разрешённым группам берём одним запросом.
    const counts = await this.client.getSeverityCounts({ assets: assetIds });

    return {
      productTypes: allowedProductTypeIds.length,
      products: products.length,
      severity: counts.severity,
      totalFindings: counts.total,
    };
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

  async changeFindingSeverity(
    findingId: number,
    severity: string,
  ): Promise<unknown> {
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
