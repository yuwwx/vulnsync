import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
} from '@nestjs/common';
import { JiraMappingsService } from './jira-mappings.service';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { CreateJiraMappingDto } from './dto/create-jira-mapping.dto';
import { UpdateJiraMappingDto } from './dto/update-jira-mapping.dto';

@Controller('mappings/jira')
export class JiraMappingsController {
  constructor(private service: JiraMappingsService) {}

  @LogAction('JIRA_MAPPINGS_GET_ALL')
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @LogAction('JIRA_MAPPINGS_GET_ONE')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @LogAction('JIRA_MAPPINGS_CREATE')
  @Post()
  create(@Body() dto: CreateJiraMappingDto) {
    return this.service.create(dto);
  }

  @LogAction('JIRA_MAPPINGS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJiraMappingDto) {
    return this.service.update(id, dto);
  }

  @LogAction('JIRA_MAPPINGS_DELETE')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
