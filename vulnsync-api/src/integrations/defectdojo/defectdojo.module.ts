// defectdojo.module.ts
import { Module } from '@nestjs/common';
import { DefectDojoClient } from './defectdojo.client';
import { DefectDojoService } from './defectdojo.service';

@Module({
  providers: [DefectDojoClient, DefectDojoService],
  exports: [DefectDojoService],
})
export class DefectDojoModule {}
