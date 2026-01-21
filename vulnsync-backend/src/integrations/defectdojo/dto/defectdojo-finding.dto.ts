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

  @Expose()
  date: string;

  @Expose()
  cvssv3_score?: number;

  @Expose()
  related_fields?: {
    test?: {
      engagement?: {
        product?: {
          name?: string;
        };
      };
    };
  };
}
