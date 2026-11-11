// vulnerabilities.controller.ts
import type { RequestUser } from '@/access/product-access.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AiMessage, VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private vulnerabilitiesService: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get()
  getVulnerabilities(
    @CurrentUser() user: RequestUser,
    @Query('productTypeId') productTypeId?: string,
    @Query('productId') productId?: string,
    @Query('testId') testId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('title') title?: string,
    @Query('sort') sort?: string,
    @Query('severity') severity?: string,
  ) {
    return this.vulnerabilitiesService.getVulnerabilities(
      user,
      {
        productTypeId: productTypeId ? Number(productTypeId) : undefined,
        productId: productId ? Number(productId) : undefined,
        testId: testId ? Number(testId) : undefined,
      },
      Number(page) || 1,
      Number(limit) || 10000,
      title,
      sort,
      severity,
    );
  }

  @LogAction('GET_VULNERABILITY')
  @Get(':id')
  getVulnerability(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.vulnerabilitiesService.getVulnerability(user, Number(id));
  }

  @LogAction('VULNERABILITY_GET_DESCRIPTION')
  @Post('description')
  previewJiraDescription(
    @CurrentUser() user: RequestUser,
    @Body() body: { findingIds: number[] },
  ) {
    return this.vulnerabilitiesService.getJiraDescriptionPreview(
      user,
      body.findingIds,
    );
  }

  @LogAction('VULNERABILITY_ASK_AI')
  @Post('ai')
  askAi(
    @CurrentUser() user: RequestUser,
    @Body() body: { findingIds: number[]; messages?: AiMessage[] },
  ) {
    if (
      !Array.isArray(body.findingIds) ||
      body.findingIds.length === 0 ||
      body.findingIds.length > 20 ||
      (body.messages &&
        (!Array.isArray(body.messages) ||
          body.messages.length > 20 ||
          body.messages.some(
            (message) =>
              !['user', 'assistant'].includes(message.role) ||
              typeof message.content !== 'string' ||
              message.content.length === 0 ||
              message.content.length > 10000,
          )))
    ) {
      throw new Error('Некорректные данные для AI-диалога');
    }

    return this.vulnerabilitiesService.askAi(
      user,
      body.findingIds,
      body.messages,
    );
  }
}
