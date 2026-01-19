// mappings/dto/create-jira-mapping.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';

export class CreateJiraMappingDto {
  @IsNumber()
  @IsNotEmpty()
  productType: number;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>; // custom fields для Jira
}
