// vulnerabilities.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private vulnerabilitiesService: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get(':productId')
  getVulnerabilities(@Param('productId') productId: number) {
    return this.vulnerabilitiesService.getVulnerabilities(productId);
  }

  @LogAction('VULNERABILITY_GET_DESCRIPTION')
  @Post('description')
  previewJiraDescription(@Body() body: { findingIds: number[] }) {
    return this.vulnerabilitiesService.getJiraDescriptionPreview(
      body.findingIds,
    );
  }
}
