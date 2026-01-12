// jira.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common';
import { JiraService } from './jira.service';
import { CreateJiraIssueDto } from './dto/create-jira-issue.dto';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('integrations/jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @LogAction('JIRA_CREATE_ISSUE')
  @Post('issue')
  createIssue(@Body() dto: CreateJiraIssueDto, @Req() req) {
    return this.jiraService.createIssue(
      dto.findingId,
      dto.productId,
      req.user.id,
    );
  }
}
