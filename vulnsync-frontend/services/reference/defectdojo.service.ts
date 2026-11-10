import { api } from "../api";

// Типы DefectDojo — единый источник, используются и справочниками, и вкладками продуктов.
export type DefectDojoProduct = {
  id: number;
  name: string;
  description?: string;
  findingsCount?: number;
};

export type DefectDojoProductType = {
  id: number;
  name: string;
  description?: string;
};

export type DefectDojoTest = {
  id: number;
  title?: string;
  testTypeName?: string;
  scanType?: string;
  version?: string;
  buildId?: string;
  branchTag?: string;
  commitHash?: string;
  targetStart?: string;
  targetEnd?: string;
};

export type DefectDojoEngagement = {
  id: number;
  name?: string;
  version?: string;
  buildId?: string;
  branchTag?: string;
  commitHash?: string;
  status?: string;
  engagementType?: string;
  targetStart?: string;
  targetEnd?: string;
  tests: DefectDojoTest[];
};

export const DefectDojoReferenceService = {
  async getProducts(productTypeId?: number): Promise<DefectDojoProduct[]> {
    const { data } = await api.get<DefectDojoProduct[]>(
      "/integrations/defectdojo/products",
      { params: { productTypeId } },
    );
    return data;
  },

  async getProductScans(productId: number): Promise<DefectDojoEngagement[]> {
    const { data } = await api.get<DefectDojoEngagement[]>(
      `/integrations/defectdojo/products/${productId}/scans`,
    );
    return data;
  },

  async getProductSeverityCounts(
    productId: number,
  ): Promise<Record<string, number>> {
    const { data } = await api.get<Record<string, number>>(
      `/integrations/defectdojo/products/${productId}/severity-counts`,
    );
    return data;
  },

  async getProductTypes(): Promise<DefectDojoProductType[]> {
    const { data } = await api.get<DefectDojoProductType[]>(
      "/integrations/defectdojo/product-types",
    );
    return data;
  },
};
