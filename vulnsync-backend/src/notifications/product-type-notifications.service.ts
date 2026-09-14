// src/notifications/product-type-notifications.service.ts
// Настройка списка получателей уведомлений по engagement
// в дополнение к DD_REPORT_MAIL_TO - отдельно для каждого типа продукта DefectDojo.
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Разбирает список адресов (запятая / точка с запятой / перевод строки / пробел)
// в уникальный массив валидных адресов. Бросает ошибку при невалидном адресе.
export function parseEmailList(raw: string): string[] {
  const result: string[] = [];

  for (const token of raw.split(/[,;\s]+/)) {
    if (!token) {
      continue;
    }

    if (!EMAIL_RE.test(token)) {
      throw new BadRequestException(`Некорректный email: ${token}`);
    }

    if (!result.some((e) => e.toLowerCase() === token.toLowerCase())) {
      result.push(token);
    }
  }

  return result;
}

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
