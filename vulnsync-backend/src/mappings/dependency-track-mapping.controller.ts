import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { CreateDependencyTrackMappingDto } from './dto/create-dependency-track-mapping.dto';
import { UpdateDependencyTrackMappingDto } from './dto/update-dependency-track-mapping.dto';
import { DependencyTrackMappingsService } from './dependency-track-mapping.service';

@Controller('mappings/dependency-track')
export class DependencyTrackMappingsController {
  constructor(private service: DependencyTrackMappingsService) {}

  @LogAction('DT_MAPPINGS_GET')
  @Get()
  get(@Query('ddProductId') ddProductId?: number) {
    if (ddProductId) {
      return this.service.getByProduct(ddProductId);
    }
    return this.service.getAll();
  }

  @LogAction('DT_MAPPINGS_GET_ONE')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @LogAction('DT_MAPPINGS_CREATE')
  @Post()
  create(@Body() dto: CreateDependencyTrackMappingDto) {
    return this.service.create(dto);
  }

  @LogAction('DT_MAPPINGS_UPDATE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDependencyTrackMappingDto,
  ) {
    return this.service.update(id, dto);
  }

  @LogAction('DT_MAPPINGS_DELETE')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
