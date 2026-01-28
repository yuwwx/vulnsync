import { api } from "./api";

// Типы
export interface DefectDojoProduct {
  id: number;
  name: string;
}

export interface DefectDojoProductType {
  id: number;
  name: string;
}

export interface DependencyTrackProject {
  id: string;
  name: string;
}

// Сервис
export const IntegrationsService = {
  // DefectDojo
  async getDefectDojoProductTypes(): Promise<DefectDojoProductType[]> {
    const { data } = await api.get<DefectDojoProductType[]>(
      "/integrations/defectdojo/product-types",
    );
    return data;
  },

  async getDefectDojoProducts(
    productTypeId: number,
  ): Promise<DefectDojoProductType[]> {
    const { data } = await api.get("/integrations/defectdojo/products", {
      params: { productTypeId },
    });
    return data;
  },

  async getDefectDojoFinding(id: number): Promise<DefectDojoProductType[]> {
    const { data } = await api.get(`/integrations/defectdojo/finding/${id}`);
    return data;
  },

  // Dependency-Track
  async getDependencyTrackProjects(): Promise<DependencyTrackProject[]> {
    const { data } = await api.get<DependencyTrackProject[]>(
      "/integrations/dependency-track/projects",
    );
    return data;
  },

  async exportDependencyTrackToDefectDojo(ddProductId: number) {
    const { data } = await api.post("/integrations/dependency-track/export", {
      ddProductId: ddProductId,
    });
    return data;
  },

  async syncKev() {
    const { data } = await api.post("/integrations/dependency-track/sync-kev");
    return data;
  },
};
