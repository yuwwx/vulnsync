// dependency-track.module.ts
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';
import { MappingsModule } from '@/mappings/mappings.module';
import { Module } from '@nestjs/common';
import { DependencyTrackClient } from './dependency-track.client';
import { DependencyTrackController } from './dependency-track.controller';
import { DependencyTrackService } from './dependency-track.service';

@Module({
  imports: [DefectDojoModule, MappingsModule],
  providers: [DependencyTrackClient, DependencyTrackService],
  controllers: [DependencyTrackController],
})
export class DependencyTrackModule {}
