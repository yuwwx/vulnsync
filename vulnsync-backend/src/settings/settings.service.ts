import { PrismaService } from '@/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateIntegrationSettingDto } from './dto/create-integration-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';

type IntegrationSettingResponse = {
  id: string;
  type: string;
  baseUrl: string;
  updatedAt?: Date;
  isConfigured: boolean;
  severityCustomField?: string | null;
  cvssCustomField?: string | null;
  vulnerabilityIdCustomField?: string | null;
  systemPrompt?: string | null;
  model?: string | null;
};

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

  private toResponse(setting: {
    id: string;
    type: string;
    baseUrl: string;
    updatedAt?: Date;
    apiToken?: string | null;
    username?: string | null;
    password?: string | null;
    severityCustomField?: string | null;
    cvssCustomField?: string | null;
    vulnerabilityIdCustomField?: string | null;
    systemPrompt?: string | null;
    model?: string | null;
  }): IntegrationSettingResponse {
    const response: IntegrationSettingResponse = {
      id: setting.id,
      type: setting.type,
      baseUrl: setting.baseUrl,
      ...(setting.updatedAt && { updatedAt: setting.updatedAt }),
      isConfigured: this.isConfigured(setting),
    };

    if (setting.type === 'JIRA') {
      response.severityCustomField = setting.severityCustomField;
      response.cvssCustomField = setting.cvssCustomField;
      response.vulnerabilityIdCustomField = setting.vulnerabilityIdCustomField;
    }

    if (setting.type === 'ML') {
      response.systemPrompt = setting.systemPrompt;
      response.model = setting.model;
    }

    return response;
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
        systemPrompt: true,
        model: true,
      },
    });

    return settings.map((setting) => this.toResponse(setting));
  }

  async getByType(type: string) {
    const setting = await this.prisma.integrationSetting.findFirst({
      where: { type },
      select: {
        id: true,
        type: true,
        baseUrl: true,
        updatedAt: true,
        severityCustomField: true,
        cvssCustomField: true,
        vulnerabilityIdCustomField: true,
        systemPrompt: true,
        apiToken: true,
        username: true,
        password: true,
        model: true,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Integration ${type} not found`);
    }

    return this.toResponse(setting);
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

    return this.toResponse(setting);
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

    return this.toResponse(updated);
  }

  async delete(id: string) {
    await this.prisma.integrationSetting.delete({
      where: { id },
    });

    return { status: 'DELETED' };
  }
}
