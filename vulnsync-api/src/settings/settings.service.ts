import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.integrationSetting.findMany({
      select: {
        id: true,
        type: true,
        baseUrl: true,
        apiToken: true,
        updatedAt: true,
      },
    });

    return settings.map((s) => ({
      id: s.id,
      type: s.type,
      baseUrl: s.baseUrl,
      updatedAt: s.updatedAt,
      hasToken: !!s.apiToken,
    }));
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

  async create(dto: CreateIntegrationSettingDto) {
    const exists = await this.prisma.integrationSetting.findFirst({
      where: { type: dto.type },
    });

    if (exists) {
      throw new ConflictException(`Integration ${dto.type} already exists`);
    }

    const setting = await this.prisma.integrationSetting.create({
      data: dto,
    });

    return {
      id: setting.id,
      type: setting.type,
      baseUrl: setting.baseUrl,
    };
  }

  async update(id: string, dto: UpdateIntegrationSettingDto) {
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

    return {
      id: updated.id,
      type: updated.type,
      baseUrl: updated.baseUrl,
      hasToken: !!updated.apiToken,
    };
  }

  async delete(id: string) {
    await this.prisma.integrationSetting.delete({
      where: { id },
    });

    return { status: 'DELETED' };
  }
}
