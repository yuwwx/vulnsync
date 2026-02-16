// vulnerabilities.module.ts
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { JiraDescriptionModule } from '@/integrations/jira/jira-description.module';
import { JiraModule } from '@/integrations/jira/jira.module';
import { Module } from '@nestjs/common';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Module({
  imports: [DefectDojoModule, JiraModule, JiraDescriptionModule],
  providers: [VulnerabilitiesService],
  controllers: [VulnerabilitiesController],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
