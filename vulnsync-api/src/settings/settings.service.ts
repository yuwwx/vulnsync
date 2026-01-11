import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private logs: LogsService,
  ) {}

  async getAll() {
    return this.prisma.integrationSetting.findMany({
      select: {
        id: true,
        type: true,
        baseUrl: true,
        createdAt: true,
      },
    });
  }

  async getByType(type: string) {
    const setting = await this.prisma.integrationSetting.findFirst({
      where: { type },
    });

    if (!setting) {
      throw new NotFoundException(`Integration ${type} not found`);
    }

    return {
      id: setting.id,
      type: setting.type,
      baseUrl: setting.baseUrl,
    };
  }

  async create(dto: CreateIntegrationSettingDto, userId: string) {
    const exists = await this.prisma.integrationSetting.findFirst({
      where: { type: dto.type },
    });

    if (exists) {
      throw new ConflictException(`Integration ${dto.type} already exists`);
    }

    const setting = await this.prisma.integrationSetting.create({
      data: dto,
    });

    await this.logs.log('CREATE_INTEGRATION_SETTING', userId, {
      type: dto.type,
    });

    return {
      id: setting.id,
      type: setting.type,
      baseUrl: setting.baseUrl,
    };
  }

  async update(id: string, dto: UpdateIntegrationSettingDto, userId: string) {
    const setting = await this.prisma.integrationSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Integration setting not found');
    }

    const updated = await this.prisma.integrationSetting.update({
      where: { id },
      data: dto,
    });

    await this.logs.log('UPDATE_INTEGRATION_SETTING', userId, { id });

    return {
      id: updated.id,
      type: updated.type,
      baseUrl: updated.baseUrl,
    };
  }

  async delete(id: string, userId: string) {
    await this.prisma.integrationSetting.delete({
      where: { id },
    });

    await this.logs.log('DELETE_INTEGRATION_SETTING', userId, { id });

    return { status: 'DELETED' };
  }
}
