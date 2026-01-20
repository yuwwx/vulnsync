// dependency-track.controller.ts
import { LogAction } from '@/common/decorators/logAction.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { DefectDojoService } from './defectdojo.service';

@Controller('integrations/defectdojo')
export class DefectDojoController {
  constructor(private service: DefectDojoService) {}

  @LogAction('DEFECTDOJO_GET_PRODUCT_TYPES')
  @Get('product_types')
  getProductTypes() {
    return this.service.getProductTypes();
  }

  @LogAction('DEFECTDOJO_GET_PRODUCTS')
  @Get('products')
  getProducts() {
    return this.service.getProducts();
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
}
