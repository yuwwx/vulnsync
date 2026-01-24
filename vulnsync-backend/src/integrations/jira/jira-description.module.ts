// integrations/jira/jira-description.module.ts
import { Module } from '@nestjs/common';
import { JiraDescriptionService } from './jira-description.service';

@Module({
  providers: [JiraDescriptionService],
  exports: [JiraDescriptionService],
})
export class JiraDescriptionModule {}
