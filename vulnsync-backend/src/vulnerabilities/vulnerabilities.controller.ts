// vulnerabilities.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AiMessage, VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private vulnerabilitiesService: VulnerabilitiesService) {}

  @LogAction('GET_VULNERABILITIES')
  @Get(':productId')
  getVulnerabilities(
    @Param('productId') productId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10000,
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
