import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDependencyTrackMappingDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductTypeId: number;

  @IsString()
  @IsNotEmpty()
  dtProjectName: string;
}
