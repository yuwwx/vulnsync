// jira.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { JiraService } from './jira.service';

@Controller('integrations/jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @LogAction('JIRA_CREATE_ISSUE')
  @Post('create-issue')
  createIssue(@Body() payload) {
    return this.jiraService.createIssue(payload);
  }
}
