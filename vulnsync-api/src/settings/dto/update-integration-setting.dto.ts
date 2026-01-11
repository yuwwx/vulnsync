import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateIntegrationSettingDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiToken?: string;
}
