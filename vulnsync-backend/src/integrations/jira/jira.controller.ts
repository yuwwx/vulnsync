// jira.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { JiraService } from './jira.service';

@Controller('integrations/jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @LogAction('JIRA_CREATE_ISSUE')
  @Post('create-issue')
  createIssue(@Body() payload) {
    return this.jiraService.createIssue(payload);
  }

  @Get('projects')
  async getProjects() {
    return this.jiraService.getProjects();
  }

  @Get('custom-fields')
  async getCustomFields() {
    return this.jiraService.getCustomFields();
  }
}
