// dto/import-project.dto.ts
import { IsUUID, IsNumber } from 'class-validator';

export class ImportProjectDto {
  @IsUUID()
  projectUuid: string;

  @IsNumber()
  defectDojoProductId: number;
}
