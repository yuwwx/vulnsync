// mappings/dto/update-jira-mapping.dto.ts
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateJiraMappingDto {
  @IsString()
  @IsOptional()
  productType: string;

  @IsString()
  @IsOptional()
  projectKey?: string;

  @IsString()
  @IsOptional()
  issueType?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;
}
