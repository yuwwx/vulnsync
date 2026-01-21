// mappings/dto/create-jira-mapping.dto.ts
import { IsNotEmpty, IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateJiraMappingDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductTypeId: number;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>; // custom fields для Jira
}
