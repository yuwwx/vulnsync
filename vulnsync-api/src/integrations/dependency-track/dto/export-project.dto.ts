import { IsUUID, IsNumber } from 'class-validator';

export class ExportProjectDto {
  @IsUUID()
  projectUuid: string;

  @IsNumber()
  defectDojoProductId: number;
}
