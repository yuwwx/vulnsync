// jira.module.ts
import { Module } from '@nestjs/common';
import { JiraClient } from './jira.client';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';
import { VulnerabilitiesModule } from '@/vulnerabilities/vulnerabilities.module';

@Module({
  imports: [VulnerabilitiesModule],
  providers: [JiraClient, JiraService],
  controllers: [JiraController],
})
export class JiraModule {}
