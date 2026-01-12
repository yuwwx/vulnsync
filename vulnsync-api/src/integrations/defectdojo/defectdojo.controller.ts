// dependency-track.controller.ts
import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { LogAction } from '@/common/decorators/logAction.decorator';
import { DefectDojoService } from './defectdojo.service';

@Controller('integrations/defectdojo')
export class DefectDojoController {
  constructor(private service: DefectDojoService) {}

  @LogAction('DEFECTDOJO_GET_PRODUCTS')
  @Get('products')
  getProducts() {
    return this.service.getProducts();
  }
}
