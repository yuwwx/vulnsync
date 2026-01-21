// mappings/dto/update-jira-mapping.dto.ts
import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class UpdateJiraMappingDto {
  @IsNumber()
  @IsOptional()
  ddProductTypeId: number;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;
}
