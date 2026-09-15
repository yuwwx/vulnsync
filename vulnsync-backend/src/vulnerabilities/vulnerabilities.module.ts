// vulnerabilities.module.ts
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { JiraModule } from '@/integrations/jira/jira.module';
import { Module } from '@nestjs/common';
import { SettingsModule } from '@/settings/settings.module';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Module({
  imports: [
    DefectDojoModule,
    JiraModule,
    SettingsModule,
  ],
  providers: [VulnerabilitiesService],
  controllers: [VulnerabilitiesController],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
