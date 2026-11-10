export interface DefectDojoProductType {
  id: number;
  name: string;
}

export interface DefectDojoProduct {
  id: number;
  name: string;
  prod_type?: number;
  findings_count?: number;
}

export interface DefectDojoEngagement {
  id: number;
  name?: string;
  product?: number;
  version?: string;
  build_id?: string;
  branch_tag?: string;
  commit_hash?: string;
  status?: string;
  engagement_type?: string;
  target_start?: string;
  target_end?: string;
}

export interface DefectDojoTest {
  id: number;
  title?: string;
  engagement?: number;
  test_type_name?: string;
  scan_type?: string;
  version?: string;
  build_id?: string;
  branch_tag?: string;
  commit_hash?: string;
  target_start?: string;
  target_end?: string;
}
