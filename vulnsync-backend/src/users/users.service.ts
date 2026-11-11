import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  jobTitle: true,
  role: true,
  allowedProductTypeIds: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { username: 'asc' },
    });
  }

  async updateProductTypes(id: string, allowedProductTypeIds: number[]) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        allowedProductTypeIds: [...new Set(allowedProductTypeIds)],
      },
      select: USER_SELECT,
    });
  }
}
