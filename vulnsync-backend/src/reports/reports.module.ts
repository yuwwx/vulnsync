// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { MailerService } from './mailer.service';
import { ReportsController } from './reports.controller';
import { FindingsReportService } from './findings-report.service';

@Module({
  imports: [DefectDojoModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [MailerService, FindingsReportService],
  exports: [FindingsReportService],
})
export class ReportsModule {}
