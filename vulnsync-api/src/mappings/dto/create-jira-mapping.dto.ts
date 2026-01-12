// mappings/dto/create-jira-mapping.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateJiraMappingDto {
  @IsString()
  @IsNotEmpty()
  productType: string;

  @IsString()
  @IsNotEmpty()
  projectKey: string;

  @IsString()
  @IsNotEmpty()
  issueType: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>; // custom fields для Jira
}
