import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, ip?: string, userId?: string, meta?: any) {
    return this.prisma.log.create({
      data: { action, ip, userId, meta },
    });
  }
}
