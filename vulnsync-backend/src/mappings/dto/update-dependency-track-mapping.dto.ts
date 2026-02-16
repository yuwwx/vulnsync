import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDependencyTrackMappingDto {
  @IsString()
  @IsNotEmpty()
  dtProjectName: string;
}
