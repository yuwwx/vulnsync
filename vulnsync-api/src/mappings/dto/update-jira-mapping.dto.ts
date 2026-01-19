// mappings/dto/update-jira-mapping.dto.ts
import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class UpdateJiraMappingDto {
  @IsNumber()
  @IsOptional()
  productType: number;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;
}
