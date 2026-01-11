// vulnerabilities.module.ts
import { Module } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';

@Module({
  imports: [DefectDojoModule],
  providers: [VulnerabilitiesService],
  controllers: [VulnerabilitiesController],
})
export class VulnerabilitiesModule {}
