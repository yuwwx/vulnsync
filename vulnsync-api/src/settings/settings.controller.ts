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

@Controller('settings/integrations')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get(':type')
  getByType(@Param('type') type: string) {
    return this.service.getByType(type);
  }

  @Post()
  create(@Body() dto: CreateIntegrationSettingDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIntegrationSettingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
