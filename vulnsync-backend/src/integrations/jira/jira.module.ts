// jira.module.ts
import { Module } from '@nestjs/common';
import { JiraClient } from './jira.client';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';
import { VulnerabilitiesModule } from '@/vulnerabilities/vulnerabilities.module';
import { DefectDojoModule } from '../defectdojo/defectdojo.module';

@Module({
  imports: [VulnerabilitiesModule, DefectDojoModule],
  providers: [JiraClient, JiraService],
  controllers: [JiraController],
})
export class JiraModule {}
