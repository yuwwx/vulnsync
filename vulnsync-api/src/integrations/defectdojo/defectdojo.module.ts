// defectdojo.module.ts
import { Module } from '@nestjs/common';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoService } from './defectdojo.service';
import { DefectDojoController } from './defectdojo.controller';

@Module({
  imports: [DefectDojoModule],
  providers: [DefectDojoClient, DefectDojoService],
  exports: [DefectDojoClient, DefectDojoService],
  controllers: [DefectDojoController],
})
export class DefectDojoModule {}
