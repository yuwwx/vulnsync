import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateIntegrationSettingDto {
  @IsOptional()
  @IsUrl()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiToken?: string;
}
