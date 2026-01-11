import { IsEnum, IsString, IsUrl } from 'class-validator';
import { IntegrationType } from '@/common/enums/integration-type.enum';

export class CreateIntegrationSettingDto {
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsUrl()
  baseUrl: string;

  @IsString()
  apiToken: string;
}
