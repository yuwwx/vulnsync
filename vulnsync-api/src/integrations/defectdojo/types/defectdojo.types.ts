export interface DefectDojoProduct {
  id: number;
  name: string;
}

export interface DefectDojoFinding {
  id: number;
  title: string;
  severity: string;
  description: string;
  active: boolean;
  verified: boolean;
  mitigation?: string;
}
