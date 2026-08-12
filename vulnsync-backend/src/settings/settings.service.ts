import { PrismaService } from '@/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private isConfigured(setting: {
    type: string;
    baseUrl?: string | null;
    apiToken?: string | null;
    username?: string | null;
    password?: string | null;
  }) {
    if (!setting.baseUrl?.trim()) {
      return false;
    }

    if (setting.type === 'JIRA') {
      return !!setting.username?.trim() && !!setting.password?.trim();
    }

    return !!setting.apiToken?.trim();
  }

  async getAll() {
    const settings = await this.prisma.integrationSetting.findMany({
      select: {
        id: true,
        type: true,
        baseUrl: true,
        apiToken: true,
        username: true,
        password: true,
        updatedAt: true,
        severityCustomField: true,
        cvssCustomField: true,
        vulnerabilityIdCustomField: true,
      },
    });

    return settings.map((s) => ({
      id: s.id,
      type: s.type,
      baseUrl: s.baseUrl,
      updatedAt: s.updatedAt,
      severityCustomField: s.severityCustomField,
      cvssCustomField: s.cvssCustomField,
      vulnerabilityIdCustomField: s.vulnerabilityIdCustomField,
      isConfigured: this.isConfigured(s),
    }));
  }

  async getByType(type: string) {
    const setting = await this.prisma.integrationSetting.findFirst({
      where: { type },
      select: {
        id: true,
        type: true,
        baseUrl: true,
        severityCustomField: true,
        systemPrompt: true,
        apiToken: true,
        username: true,
        password: true,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Integration ${type} not found`);
    }

    return {
      id: setting.id,
      type: setting.type,
      baseUrl: setting.baseUrl,
      severityCustomField: setting.severityCustomField,
      isConfigured: this.isConfigured(setting),
      systemPrompt: setting.systemPrompt,
    };
  }

  async getSecretByType(type: string) {
    const setting = await this.prisma.integrationSetting.findFirst({
      where: { type },
      select: { apiToken: true },
    });
    return setting?.apiToken;
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
      severityCustomField: setting.severityCustomField,
      cvssCustomField: setting.cvssCustomField,
      vulnerabilityIdCustomField: setting.vulnerabilityIdCustomField,
      isConfigured: this.isConfigured(setting),
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
      severityCustomField: updated.severityCustomField,
      cvssCustomField: updated.cvssCustomField,
      vulnerabilityIdCustomField: updated.vulnerabilityIdCustomField,
      isConfigured: this.isConfigured(updated),
    };
  }

  async delete(id: string) {
    await this.prisma.integrationSetting.delete({
      where: { id },
    });

    return { status: 'DELETED' };
  }
}
