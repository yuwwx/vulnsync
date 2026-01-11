// dto/defectdojo-finding.dto.ts
import { Expose } from 'class-transformer';

export class DefectDojoFindingDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  severity: string;

  @Expose()
  description: string;
}
