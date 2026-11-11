// product-access.service.ts
// Ограничение доступа к группам продуктов DefectDojo.
// Роли ADMIN и VIEWER не ограничены; для USER доступны только типы продуктов
// из User.allowedProductTypeIds (пустой массив - доступ закрыт).
import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException, Injectable } from '@nestjs/common';

export type RequestUser = {
  id?: string;
  username?: string;
  role?: string;
};

// null - без ограничений (все группы продуктов)
export type ProductScope = number[] | null;

const UNRESTRICTED_ROLES = ['ADMIN', 'VIEWER'];

@Injectable()
export class ProductAccessService {
  constructor(private prisma: PrismaService) {}

  // Роль и список групп читаем из БД, а не из JWT: изменения доступа
  // применяются без повторного входа пользователя.
  async getScope(user?: RequestUser): Promise<ProductScope> {
    if (!user?.id) {
      return [];
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, allowedProductTypeIds: true },
    });

    if (!dbUser) {
      return [];
    }

    if (UNRESTRICTED_ROLES.includes(dbUser.role)) {
      return null;
    }

    return dbUser.allowedProductTypeIds;
  }

  // Проверка по уже полученному scope: не делает лишний запрос в БД.
  assertIdInScope(
    scope: ProductScope,
    productTypeId: number | null | undefined,
  ) {
    if (
      !productTypeId ||
      (scope !== null && !scope.includes(Number(productTypeId)))
    ) {
      throw new ForbiddenException('Нет доступа к этой группе продуктов');
    }
  }

  filterProductTypeIds<T extends { id: number }>(
    scope: ProductScope,
    productTypes: T[],
  ): T[] {
    if (scope === null) {
      return productTypes;
    }

    return productTypes.filter((productType) =>
      scope.includes(Number(productType.id)),
    );
  }
}
