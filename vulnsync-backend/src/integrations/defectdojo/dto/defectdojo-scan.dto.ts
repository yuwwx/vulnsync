// dto/defectdojo-scan.dto.ts
import { Expose } from 'class-transformer';

export class DefectDojoTestDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose({ name: 'test_type_name' })
  testTypeName?: string;

  @Expose({ name: 'scan_type' })
  scanType?: string;

  @Expose()
  version?: string;

  @Expose({ name: 'build_id' })
  buildId?: string;

  @Expose({ name: 'branch_tag' })
  branchTag?: string;

  @Expose({ name: 'commit_hash' })
  commitHash?: string;

  @Expose({ name: 'target_start' })
  targetStart?: string;

  @Expose({ name: 'target_end' })
  targetEnd?: string;
}

export class DefectDojoEngagementDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  version?: string;

  @Expose({ name: 'build_id' })
  buildId?: string;

  @Expose({ name: 'branch_tag' })
  branchTag?: string;

  @Expose({ name: 'commit_hash' })
  commitHash?: string;

  @Expose()
  status?: string;

  @Expose({ name: 'engagement_type' })
  engagementType?: string;

  @Expose({ name: 'target_start' })
  targetStart?: string;

  @Expose({ name: 'target_end' })
  targetEnd?: string;

  tests: DefectDojoTestDto[];
}
