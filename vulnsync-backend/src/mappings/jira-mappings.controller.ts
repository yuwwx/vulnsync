import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateJiraMappingDto } from './dto/create-jira-mapping.dto';
import { UpdateJiraMappingDto } from './dto/update-jira-mapping.dto';
import { JiraMappingsService } from './jira-mappings.service';

// Маппинги - настройка интеграции, недоступная обычным пользователям.
// Читать могут администраторы и технические учётки (VIEWER).
@Controller('mappings/jira')
export class JiraMappingsController {
  constructor(private service: JiraMappingsService) {}

  @LogAction('JIRA_MAPPINGS_GET')
  @Roles('ADMIN', 'VIEWER')
  @Get()
  get(@Query('ddProductTypeId') ddProductTypeId?: number) {
    if (ddProductTypeId) {
      return this.service.getByProductType(ddProductTypeId);
    }
    return this.service.getAll();
  }

  @LogAction('JIRA_MAPPINGS_GET_ONE')
  @Roles('ADMIN', 'VIEWER')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @LogAction('JIRA_MAPPINGS_CREATE')
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateJiraMappingDto) {
    return this.service.create(dto);
  }

  @LogAction('JIRA_MAPPINGS_UPDATE')
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJiraMappingDto) {
    return this.service.update(id, dto);
  }

  @LogAction('JIRA_MAPPINGS_DELETE')
  @Roles('ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
