// defectdojo.module.ts
import { Module } from '@nestjs/common';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoController } from './defectdojo.controller';
import { DefectDojoService } from './defectdojo.service';

@Module({
  imports: [DefectDojoModule],
  providers: [DefectDojoClient, DefectDojoService],
  exports: [DefectDojoClient, DefectDojoService],
  controllers: [DefectDojoController],
})
export class DefectDojoModule {}
