import { api } from "./api";

// Действия над интеграциями, которые не являются просто чтением справочников
// (справочники — в services/reference/).
export type DefectDojoFinding = Record<string, unknown>;

export const IntegrationActions = {
  async getDefectDojoFinding(id: number): Promise<DefectDojoFinding> {
    const { data } = await api.get<DefectDojoFinding>(
      `/integrations/defectdojo/finding/${id}`,
    );
    return data;
  },

  async exportDependencyTrackToDefectDojo(ddProductId: number) {
    const { data } = await api.post("/integrations/dependency-track/export", {
      ddProductId: ddProductId,
    });
    return data;
  },
};
