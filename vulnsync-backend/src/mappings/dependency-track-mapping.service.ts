import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDependencyTrackMappingDto } from './dto/create-dependency-track-mapping.dto';
import { UpdateDependencyTrackMappingDto } from './dto/update-dependency-track-mapping.dto';

@Injectable()
export class DependencyTrackMappingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.dependencyTrackMapping.findMany();
  }

  async getByProduct(productId: number) {
    const mapping = await this.prisma.dependencyTrackMapping.findFirst({
      where: { ddProductId: productId },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping not found for ddProductId=${productId}`,
      );
    }

    return mapping;
  }

  async getById(id: string) {
    const mapping = await this.prisma.dependencyTrackMapping.findUnique({
      where: { id },
    });
    if (!mapping) {
      throw new NotFoundException(
        `Dependency-Track mapping with id ${id} not found`,
      );
    }
    return mapping;
  }

  async create(dto: CreateDependencyTrackMappingDto) {
    return this.prisma.dependencyTrackMapping.create({
      data: {
        ddProductId: dto.ddProductId,
        dtProjectName: dto.dtProjectName,
      },
    });
  }

  async update(id: string, dto: UpdateDependencyTrackMappingDto) {
    await this.getById(id);
    return this.prisma.dependencyTrackMapping.update({
      where: { id },
      data: {
        dtProjectName: dto.dtProjectName,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.dependencyTrackMapping.delete({ where: { id } });
  }
}
