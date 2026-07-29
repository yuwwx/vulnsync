// dependency-track.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { DefectDojoService } from './defectdojo.service';

@Controller('integrations/defectdojo')
export class DefectDojoController {
  constructor(private service: DefectDojoService) {}

  @LogAction('DEFECTDOJO_GET_PRODUCT_TYPES')
  @Get('product-types')
  getProductTypes() {
    return this.service.getProductTypes();
  }

  @LogAction('DEFECTDOJO_GET_PRODUCTS')
  @Get('products')
  getProducts(@Query('productTypeId') productTypeId?: number) {
    return this.service.getProducts(productTypeId);
  }

  @LogAction('DEFECTDOJO_GET_PRODUCT')
  @Get('product/:productId')
  getProduct(@Param('productId') productId: number) {
    return this.service.getProduct(productId);
  }

  @LogAction('DEFECTDOJO_GET_FINDINGS_BY_PRODUCT')
  @Get('findings/:productId')
  getFindingsByProduct(@Param('productId') productId: number) {
    return this.service.getFindingsByProduct(productId);
  }

  @LogAction('DEFECTDOJO_GET_FINDING')
  @Get('finding/:findingId')
  getFinding(@Param('findingId') findingId: number) {
    return this.service.getFinding(findingId);
  }

  @LogAction('DEFECTDOJO_CHANGE_FINDING_SEVERITY')
  @Patch('finding/:findingId/severity')
  changeFindingSeverity(
    @Param('findingId') findingId: number,
    @Body('severity') severity: string,
  ) {
    return this.service.changeFindingSeverity(findingId, severity);
  }
}
