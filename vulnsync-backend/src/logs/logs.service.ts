import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { SyslogService } from './syslog.service';

type LogMetadata = Prisma.InputJsonValue;

// Событие кибербезопасности: фиксируем, кто, что, откуда и когда сделал.
export interface LogEvent {
  action: string;
  // Source IP (клиент) и Destination IP (хост приложения)
  ip?: string;
  destinationIp?: string;
  userId?: string;
  username?: string;
  // Сервис/служба — источник события (например, auth, Vulnerabilities)
  service?: string;
  description?: string;
  meta?: LogMetadata;
}

@Injectable()
export class LogsService {
  constructor(
    private prisma: PrismaService,
    private syslog: SyslogService,
  ) {}

  async log(event: LogEvent) {
    // В SIEM отправляем независимо от успеха записи в БД.
    this.syslog.send(event);

    return this.prisma.log.create({
      data: {
        action: event.action,
        service: event.service,
        description: event.description,
        ip: event.ip,
        destinationIp: event.destinationIp,
        userId: event.userId,
        username: event.username,
        meta: event.meta,
        // Единое время события.
        createdAt: new Date(),
      },
    });
  }

  async findAll() {
    // Журнал растёт неограниченно: отдаём только последние события.
    return this.prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }
}
