// vulnerabilities.controller.ts
import { Controller, Get, Param, Req } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private service: VulnerabilitiesService) {}

  @Get('products')
  getProducts(@Req() req) {
    return this.service.getProducts(req.user.id);
  }

  @Get(':productName')
  getVulnerabilities(@Param('productName') productName: string, @Req() req) {
    return this.service.getVulnerabilities(productName, req.user.id);
  }
}
