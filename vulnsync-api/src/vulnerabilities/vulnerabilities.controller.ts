// vulnerabilities.controller.ts
import { Controller, Get, Param, Req } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private service: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get(':productName')
  getVulnerabilities(@Param('productName') productName: string, @Req() req) {
    return this.service.getVulnerabilities(productName);
  }
}
