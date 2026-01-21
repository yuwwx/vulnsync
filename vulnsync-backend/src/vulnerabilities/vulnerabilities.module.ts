// vulnerabilities.module.ts
import { Module } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { LogsService } from '@/logs/logs.service';

@Module({
  imports: [DefectDojoModule],
  providers: [VulnerabilitiesService],
  controllers: [VulnerabilitiesController],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
