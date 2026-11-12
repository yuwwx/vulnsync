// jira.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get } from '@nestjs/common';
import { JiraService } from './jira.service';

@Controller('integrations/jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @LogAction('JIRA_GET_PROJECTS')
  @Get('projects')
  async getProjects(): Promise<unknown> {
    return this.jiraService.getProjects();
  }

  @LogAction('JIRA_GET_CUSTOM_FIELDS')
  @Get('custom-fields')
  async getCustomFields(): Promise<unknown> {
    return this.jiraService.getCustomFields();
  }
}
