import { Global, Module } from '@nestjs/common';
import { ProductAccessService } from './product-access.service';

@Global()
@Module({
  providers: [ProductAccessService],
  exports: [ProductAccessService],
})
export class AccessModule {}
