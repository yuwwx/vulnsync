// dependency-track.controller.ts
import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { DependencyTrackService } from './dependency-track.service';
import { ExportProjectDto } from './dto/export-project.dto';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('integrations/dependency-track')
export class DependencyTrackController {
  constructor(private service: DependencyTrackService) {}

  @LogAction('DEPENDENCY_TRACK_GET_PROJECTS')
  @Get('projects')
  getProjects() {
    return this.service.getProjects();
  }

  @LogAction('DEPENDENCY_TRACK_EXPORT')
  @Post('export')
  importProject(@Body() dto: ExportProjectDto) {
    return this.service.importProjectFindings(
      dto.projectUuid,
      dto.defectDojoProductId,
    );
  }
}
