// mappings/mappings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateJiraMappingDto } from './dto/create-jira-mapping.dto';
import { UpdateJiraMappingDto } from './dto/update-jira-mapping.dto';

@Injectable()
export class JiraMappingsService {
  constructor(private prisma: PrismaService) {}

  // Получить все маппинги
  async getAll() {
    return this.prisma.jiraMapping.findMany();
  }

  // Получить один маппинг по ID
  async getById(id: string) {
    const mapping = await this.prisma.jiraMapping.findUnique({ where: { id } });
    if (!mapping) {
      throw new NotFoundException(`Jira mapping with id ${id} not found`);
    }
    return mapping;
  }

  // Создать маппинг
  async create(dto: CreateJiraMappingDto) {
    return this.prisma.jiraMapping.create({
      data: {
        productType: dto.productType,
        projectKey: dto.projectKey,
        issueType: dto.issueType,
        fields: dto.fields || {},
      },
    });
  }

  // Обновить маппинг
  async update(id: string, dto: UpdateJiraMappingDto) {
    // Проверяем, что запись существует
    await this.getById(id);

    return this.prisma.jiraMapping.update({
      where: { id },
      data: {
        projectKey: dto.projectKey,
        issueType: dto.issueType,
        fields: dto.fields,
      },
    });
  }

  // Удалить маппинг
  async delete(id: string) {
    // Проверяем, что запись существует
    await this.getById(id);

    return this.prisma.jiraMapping.delete({ where: { id } });
  }
}
