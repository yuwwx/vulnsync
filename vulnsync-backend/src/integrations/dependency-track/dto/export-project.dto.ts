import { IsNumber } from 'class-validator';

export class ExportProjectDto {
  @IsNumber()
  ddProductId: number;
}
