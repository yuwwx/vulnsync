import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class UpdateUserProductTypesDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  allowedProductTypeIds: number[];
}
