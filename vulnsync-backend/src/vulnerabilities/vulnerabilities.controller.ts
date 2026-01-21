// vulnerabilities.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private service: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get(':productId')
  getVulnerabilities(@Param('productId') productId: number) {
    return this.service.getVulnerabilities(productId);
  }
}
