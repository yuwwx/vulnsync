import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DependencyTrackMappingsController } from './dependency-track-mapping.controller';
import { DependencyTrackMappingsService } from './dependency-track-mapping.service';
import { JiraMappingsController } from './jira-mappings.controller';
import { JiraMappingsService } from './jira-mappings.service';

@Module({
  imports: [PrismaModule],
  providers: [JiraMappingsService, DependencyTrackMappingsService],
  controllers: [JiraMappingsController, DependencyTrackMappingsController],
  exports: [JiraMappingsService, DependencyTrackMappingsService],
})
export class MappingsModule {}
