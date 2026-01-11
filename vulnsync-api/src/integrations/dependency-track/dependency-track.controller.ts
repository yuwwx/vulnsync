// dependency-track.controller.ts
import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { DependencyTrackService } from './dependency-track.service';
import { ImportProjectDto } from './dto/import-project.dto';

@Controller('dependency-track')
export class DependencyTrackController {
  constructor(private service: DependencyTrackService) {}

  @Get('projects')
  getProjects(@Req() req) {
    return this.service.getProjects(req.user.id);
  }

  @Post('import')
  importProject(@Body() dto: ImportProjectDto, @Req() req) {
    return this.service.importProjectFindings(
      dto.projectUuid,
      dto.defectDojoProductId,
      req.user.id,
    );
  }
}
