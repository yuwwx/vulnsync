// mappings/mappings.service.ts
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJiraMappingDto } from './dto/create-jira-mapping.dto';
import { UpdateJiraMappingDto } from './dto/update-jira-mapping.dto';

@Injectable()
export class JiraMappingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.jiraMapping.findMany();
  }

  async getByProductType(productType: number) {
    const mapping = await this.prisma.jiraMapping.findUnique({
      where: { ddProductTypeId: productType },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Jira mapping for ddProductTypeId=${productType} not found`,
      );
    }

    return mapping;
  }

  async getById(id: string) {
    const mapping = await this.prisma.jiraMapping.findUnique({ where: { id } });
    if (!mapping) {
      throw new NotFoundException(`Jira mapping with id ${id} not found`);
    }
    return mapping;
  }

  async create(dto: CreateJiraMappingDto) {
    // ddProductTypeId уникален: повторный POST обновляет существующий маппинг
    return this.prisma.jiraMapping.upsert({
      where: { ddProductTypeId: dto.ddProductTypeId },
      create: {
        ddProductTypeId: dto.ddProductTypeId,
        fields: dto.fields || {},
      },
      update: {
        fields: dto.fields || {},
      },
    });
  }

  async update(id: string, dto: UpdateJiraMappingDto) {
    await this.getById(id);
    return this.prisma.jiraMapping.update({
      where: { id },
      data: {
        fields: dto.fields,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.jiraMapping.delete({ where: { id } });
  }
}
