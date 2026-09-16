import { IntegrationType } from '@/common/enums/integration-type.enum';
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
} from '@nestjs/common';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings/integrations')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @LogAction('SETTINGS_GET_INTEGRATIONS')
  @Roles('ADMIN')
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @LogAction('SETTINGS_GET_INTEGRATION')
  @Roles('ADMIN')
  @Get(':type')
  getByType(@Param('type') type: string) {
    // Некорректный тип вернёт 404 из сервиса
    return this.service.getByType(type as IntegrationType);
  }

  @LogAction('SETTINGS_CREATE_INTEGRATION')
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateIntegrationSettingDto) {
    return this.service.create(dto);
  }

  @LogAction('SETTINGS_UPDATE_INTEGRATION')
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIntegrationSettingDto) {
    return this.service.update(id, dto);
  }

  @LogAction('SETTINGS_DELETE_INTEGRATION')
  @Roles('ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
