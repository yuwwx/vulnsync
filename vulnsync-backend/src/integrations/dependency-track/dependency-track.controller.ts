// dependency-track.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { DependencyTrackService } from './dependency-track.service';
import { ExportProjectDto } from './dto/export-project.dto';

@Controller('integrations/dependency-track')
export class DependencyTrackController {
  constructor(private service: DependencyTrackService) {}

  @LogAction('DEPENDENCY_TRACK_GET_PROJECTS')
  @Get('projects')
  getProjects() {
    return this.service.getProjects();
  }

  @LogAction('DEPENDENCY_TRACK_EXPORT')
  @Roles('ADMIN')
  @Post('export')
  importProject(@Body() dto: ExportProjectDto) {
    return this.service.exportLatestProjectFindings(dto.ddProductId);
  }

  @LogAction('DEPENDENCY_TRACK_SYNC_KEV')
  @Roles('ADMIN')
  @Post('sync-kev')
  syncKev() {
    this.service.syncKevInBackground();
    return { status: 'started' };
  }
}
