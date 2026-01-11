// dependency-track.module.ts
import { Module } from '@nestjs/common';
import { DependencyTrackClient } from './dependency-track.client';
import { DependencyTrackService } from './dependency-track.service';
import { DependencyTrackController } from './dependency-track.controller';
import { DefectDojoModule } from '@/integrations/defectdojo/defectdojo.module';

@Module({
  imports: [DefectDojoModule],
  providers: [DependencyTrackClient, DependencyTrackService],
  controllers: [DependencyTrackController],
})
export class DependencyTrackModule {}
