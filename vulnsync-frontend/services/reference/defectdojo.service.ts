import { api } from "../api";

// Типы DefectDojo — единый источник, используются и справочниками, и вкладками продуктов.
export type DefectDojoProduct = {
  id: number;
  name: string;
  description?: string;
};

export type DefectDojoProductType = {
  id: number;
  name: string;
  description?: string;
};

export const DefectDojoReferenceService = {
  async getProducts(productTypeId?: number): Promise<DefectDojoProduct[]> {
    const { data } = await api.get<DefectDojoProduct[]>(
      "/integrations/defectdojo/products",
      { params: { productTypeId } },
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
