// jira.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common';
import { JiraService } from './jira.service';
import { CreateJiraIssueDto } from './dto/create-jira-issue.dto';

@Controller('jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @Post('issue')
  createIssue(@Body() dto: CreateJiraIssueDto, @Req() req) {
    return this.jiraService.createIssue(
      dto.findingId,
      dto.productType,
      req.user.id,
    );
  }
}
