import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';
import { LogAction } from '@/common/decorators/logAction.decorator';

@Controller('settings/integrations')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @LogAction('SETTINGS_GET_INTEGRATIONS')
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @LogAction('SETTINGS_GET_INTEGRATION')
  @Get(':type')
  getByType(@Param('type') type: string) {
    return this.service.getByType(type);
  }

  @LogAction('SETTINGS_CREATE_INTEGRATION')
  @Post()
  create(@Body() dto: CreateIntegrationSettingDto) {
    return this.service.create(dto);
  }

  @LogAction('SETTINGS_UPDATE_INTEGRATION')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIntegrationSettingDto) {
    return this.service.update(id, dto);
  }

  @LogAction('SETTINGS_DELETE_INTEGRATION')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
