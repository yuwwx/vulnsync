import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, ip?: string, userId?: string, meta?: any) {
    return this.prisma.log.create({
      data: { action, ip, userId, meta },
    });
  }

  async findAll() {
    return this.prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
