// vulnerabilities.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiMessage, VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private vulnerabilitiesService: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get()
  getVulnerabilities(
    @Query('productTypeId') productTypeId?: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('title') title?: string,
    @Query('sort') sort?: string,
  ) {
    return this.vulnerabilitiesService.getVulnerabilities(
      {
        productTypeId: productTypeId ? Number(productTypeId) : undefined,
        productId: productId ? Number(productId) : undefined,
      },
      Number(page) || 1,
      Number(limit) || 10000,
      title,
      sort,
    );
  }

  @LogAction('VULNERABILITY_GET_DESCRIPTION')
  @Post('description')
  previewJiraDescription(@Body() body: { findingIds: number[] }) {
    return this.vulnerabilitiesService.getJiraDescriptionPreview(
      body.findingIds,
    );
  }

  @LogAction('VULNERABILITY_ASK_AI')
  @Post('ai')
  askAi(@Body() body: { findingIds: number[]; messages?: AiMessage[] }) {
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

    return this.vulnerabilitiesService.askAi(body.findingIds, body.messages);
  }
}
