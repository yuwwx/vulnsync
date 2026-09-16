// src/notifications/product-type-notifications.service.ts
// Настройка списка получателей уведомлений по engagement
// в дополнение к DD_REPORT_MAIL_TO - отдельно для каждого типа продукта DefectDojo.
import { parseEmailList } from '@/common/email';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ProductTypeNotificationsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.productTypeNotification.findMany();
  }

  async getByProductType(ddProductTypeId: number) {
    const setting = await this.prisma.productTypeNotification.findUnique({
      where: { ddProductTypeId },
    });

    if (!setting) {
      throw new NotFoundException(
        `Product type notification setting not found for ddProductTypeId=${ddProductTypeId}`,
      );
    }

    return setting;
  }

  async save(ddProductTypeId: number, emails: string) {
    const normalized = parseEmailList(emails).join(', ');

    if (!normalized) {
      throw new BadRequestException('Список адресов пуст');
    }

    return this.prisma.productTypeNotification.upsert({
      where: { ddProductTypeId },
      update: { emails: normalized },
      create: { ddProductTypeId, emails: normalized },
    });
  }

  // Дополнительные адреса для типа продукта (без DD_REPORT_MAIL_TO)
  async getExtraEmails(ddProductTypeId: number): Promise<string[]> {
    const setting = await this.prisma.productTypeNotification.findUnique({
      where: { ddProductTypeId },
    });

    return setting ? parseEmailList(setting.emails) : [];
  }
}
