// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { MailerService } from './mailer.service';
import { ReportsController } from './reports.controller';
import { YesterdayFindingsService } from './yesterday-findings.service';

@Module({
  imports: [DefectDojoModule],
  controllers: [ReportsController],
  providers: [MailerService, YesterdayFindingsService],
  exports: [YesterdayFindingsService],
})
export class ReportsModule {}
