// defectdojo.service.ts
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoProductDto } from './dto/defectdojo-product.dto';
import { DefectDojoFindingDto } from './dto/defectdojo-finding.dto';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class DefectDojoService {
  constructor(
    private client: DefectDojoClient,
    private logs: LogsService,
  ) {}

  async getProducts(): Promise<DefectDojoProductDto[]> {
    const products = await this.client.getProducts();

    const productsArray = Array.isArray(products)
      ? products
      : products
        ? [products]
        : [];

    return plainToInstance(DefectDojoProductDto, productsArray, {
      excludeExtraneousValues: true,
    });
  }

  async getFindings(productName: string): Promise<DefectDojoFindingDto[]> {
    const findings = await this.client.getFindingsByProduct(productName);

    const findingsArray = Array.isArray(findings) ? findings : [findings];

    return plainToInstance(DefectDojoFindingDto, findingsArray, {
      excludeExtraneousValues: true,
    });
  }
}
