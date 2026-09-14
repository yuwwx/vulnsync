import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';

type LogMetadata = Prisma.InputJsonValue;

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, ip?: string, userId?: string, meta?: LogMetadata) {
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
