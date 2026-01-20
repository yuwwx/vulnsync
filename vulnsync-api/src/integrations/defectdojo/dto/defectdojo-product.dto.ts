// dto/defectdojo-product.dto.ts
import { Expose } from 'class-transformer';

export class DefectDojoProductTypeDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose({ name: 'product_type' })
  productType: number;
}
