import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDependencyTrackMappingDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductId: number;

  @IsString()
  @IsNotEmpty()
  dtProjectName: string;
}
