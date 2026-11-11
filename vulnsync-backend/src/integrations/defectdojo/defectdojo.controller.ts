// dependency-track.controller.ts
import { ProductAccessService } from '@/access/product-access.service';
import type { RequestUser } from '@/access/product-access.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { DefectDojoService } from './defectdojo.service';

@Controller('integrations/defectdojo')
export class DefectDojoController {
  constructor(
    private service: DefectDojoService,
    private access: ProductAccessService,
  ) {}

  @LogAction('DEFECTDOJO_GET_PRODUCT_TYPES')
  @Get('product-types')
  async getProductTypes(@CurrentUser() user: RequestUser) {
    const scope = await this.access.getScope(user);

    return this.access.filterProductTypeIds(
      scope,
      await this.service.getProductTypes(),
    );
  }

  @LogAction('DEFECTDOJO_GET_DASHBOARD')
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: RequestUser) {
    return this.service.getDashboard(await this.access.getScope(user));
  }

  @LogAction('DEFECTDOJO_GET_PRODUCTS')
  @Get('products')
  async getProducts(
    @CurrentUser() user: RequestUser,
    @Query('productTypeId') productTypeId?: number,
  ) {
    const scope = await this.access.getScope(user);

    if (productTypeId !== undefined && productTypeId !== null) {
      this.access.assertIdInScope(scope, Number(productTypeId));

      return this.service.getProducts(Number(productTypeId));
    }

    return this.service.getProducts(undefined, scope);
  }

  @LogAction('DEFECTDOJO_GET_PRODUCT')
  @Get('product/:productId')
  async getProduct(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: number,
  ) {
    const product = await this.service.getProduct(Number(productId));

    this.access.assertIdInScope(
      await this.access.getScope(user),
      Number(product?.prod_type),
    );

    return product;
  }

  @LogAction('DEFECTDOJO_GET_PRODUCT_SCANS')
  @Get('products/:productId/scans')
  async getProductScans(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: string,
  ) {
    await this.assertProductAccess(user, Number(productId));

    return this.service.getProductScans(Number(productId));
  }

  @LogAction('DEFECTDOJO_GET_PRODUCT_SEVERITY_COUNTS')
  @Get('products/:productId/severity-counts')
  async getProductSeverityCounts(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: string,
  ) {
    await this.assertProductAccess(user, Number(productId));

    return this.service.getProductSeverityCounts(Number(productId));
  }

  @LogAction('DEFECTDOJO_GET_PRODUCT_TYPE_SEVERITY_COUNTS')
  @Get('product-types/:productTypeId/severity-counts')
  async getProductTypeSeverityCounts(
    @CurrentUser() user: RequestUser,
    @Param('productTypeId') productTypeId: string,
  ) {
    this.access.assertIdInScope(
      await this.access.getScope(user),
      Number(productTypeId),
    );

    return this.service.getProductTypeSeverityCounts(Number(productTypeId));
  }

  @LogAction('DEFECTDOJO_GET_FINDINGS_BY_PRODUCT_TYPE')
  @Get('product-type/:productTypeId/findings')
  async getFindingsByProductType(
    @CurrentUser() user: RequestUser,
    @Param('productTypeId') productTypeId: number,
  ) {
    this.access.assertIdInScope(
      await this.access.getScope(user),
      Number(productTypeId),
    );

    return this.service.getFindings({
      test__engagement__product__prod_type: Number(productTypeId),
    });
  }

  @LogAction('DEFECTDOJO_GET_FINDING')
  @Get('finding/:findingId')
  async getFinding(
    @CurrentUser() user: RequestUser,
    @Param('findingId') findingId: number,
  ) {
    const finding = await this.service.getFinding(Number(findingId));

    await this.assertFindingAccess(user, finding);

    return finding;
  }

  @LogAction('DEFECTDOJO_CHANGE_FINDING_SEVERITY')
  @Patch('finding/:findingId/severity')
  async changeFindingSeverity(
    @CurrentUser() user: RequestUser,
    @Param('findingId') findingId: number,
    @Body('severity') severity: string,
  ) {
    const finding = await this.service.getFinding(Number(findingId));

    await this.assertFindingAccess(user, finding);

    return this.service.changeFindingSeverity(Number(findingId), severity);
  }

  // Продукт -> его группа продуктов. Для USER проверяем вхождение группы
  // в разрешённый список, для остальных проверка пропускается.
  private async assertProductAccess(user: RequestUser, productId: number) {
    const product = await this.service.getProduct(productId);

    this.access.assertIdInScope(
      await this.access.getScope(user),
      Number(product?.prod_type),
    );
  }

  private async assertFindingAccess(user: RequestUser, finding: unknown) {
    const scope = await this.access.getScope(user);

    if (scope === null) {
      return;
    }

    const productTypeId = this.service.getFindingProductTypeId(finding);

    this.access.assertIdInScope(scope, productTypeId);
  }
}
