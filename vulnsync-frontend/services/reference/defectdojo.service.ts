import { api } from "../api";

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
  async getProducts(): Promise<DefectDojoProduct[]> {
    const { data } = await api.get("/integrations/defectdojo/products");
    return data;
  },

  async getProductTypes(): Promise<DefectDojoProductType[]> {
    const { data } = await api.get("/integrations/defectdojo/product-types");
    return data;
  },
};
