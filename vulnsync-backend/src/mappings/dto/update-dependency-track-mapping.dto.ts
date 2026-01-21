import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateDependencyTrackMappingDto {
  @IsString()
  @IsNotEmpty()
  dtProjectName: string;
}
