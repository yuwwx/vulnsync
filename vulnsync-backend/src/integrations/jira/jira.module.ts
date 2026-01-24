import { Module } from '@nestjs/common';
import { JiraClient } from './jira.client';
import { JiraDescriptionService } from './jira-description.service';

@Module({
  providers: [JiraClient, JiraDescriptionService],
  exports: [JiraClient, JiraDescriptionService],
})
export class JiraModule {}
