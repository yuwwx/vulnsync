export interface DefectDojoProduct {
  id: number;
  name: string;
  product_type: number;
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
