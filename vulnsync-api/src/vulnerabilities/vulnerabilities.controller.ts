// vulnerabilities.controller.ts
import { Controller, Get, Param, Req } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private service: VulnerabilitiesService) {}

  @LogAction('DEFECTDOJO_GET_PRODUCTS')
  @Get('products')
  getProducts() {
    return this.service.getProducts();
  }

  @LogAction('DEFECTDOJO_GET_VULNERABILITIES')
  @Get(':productName')
  getVulnerabilities(@Param('productName') productName: string, @Req() req) {
    return this.service.getVulnerabilities(productName);
  }
}
