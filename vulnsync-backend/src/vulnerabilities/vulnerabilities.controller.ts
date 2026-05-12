// vulnerabilities.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private vulnerabilitiesService: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get(':productId')
  getVulnerabilities(
    @Param('productId') productId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 1000,
    @Query('title') title?: string,
  ) {
    return this.vulnerabilitiesService.getVulnerabilities(
      Number(productId),
      Number(page),
      Number(limit),
      title,
    );
  }

  @LogAction('VULNERABILITY_GET_DESCRIPTION')
  @Post('description')
  previewJiraDescription(@Body() body: { findingIds: number[] }) {
    return this.vulnerabilitiesService.getJiraDescriptionPreview(
      body.findingIds,
    );
  }
}
