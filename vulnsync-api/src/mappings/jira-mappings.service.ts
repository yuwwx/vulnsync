// mappings/mappings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateJiraMappingDto } from './dto/create-jira-mapping.dto';
import { UpdateJiraMappingDto } from './dto/update-jira-mapping.dto';

@Injectable()
export class JiraMappingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.jiraMapping.findMany();
  }

  async getByProductType(productType: number) {
    const mapping = await this.prisma.jiraMapping.findFirst({
      where: { ddProductTypeId: productType },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping not found for ddProductTypeId=${productType}`,
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
    return this.prisma.jiraMapping.create({
      data: {
        ddProductTypeId: dto.productType,
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
