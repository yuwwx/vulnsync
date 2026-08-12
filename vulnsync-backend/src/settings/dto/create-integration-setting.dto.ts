import { IntegrationType } from '@/common/enums/integration-type.enum';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateIntegrationSettingDto {
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsUrl({ require_tld: false })
  baseUrl: string;

  @IsOptional()
  @IsString()
  apiToken: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  severityCustomField: string;

  @IsOptional()
  @IsString()
  cvssCustomField: string;

  @IsOptional()
  @IsString()
  vulnerabilityIdCustomField: string;

  @IsOptional()
  @IsString()
  systemPrompt: string;

  @IsOptional()
  @IsString()
  model: string;
}
