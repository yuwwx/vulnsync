import { Module } from '@nestjs/common';
import { JiraDescriptionService } from './jira-description.service';
import { JiraClient } from './jira.client';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

@Module({
  providers: [JiraClient, JiraService, JiraDescriptionService],
  exports: [JiraClient, JiraDescriptionService],
  controllers: [JiraController],
})
export class JiraModule {}
