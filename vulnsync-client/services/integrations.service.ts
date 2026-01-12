import { api } from "./api";

// Типы
export interface DefectDojoProduct {
  id: string;
  name: string;
}

export interface JiraIssuePayload {
  findingId: string;
  productId: string;
}

export interface DependencyTrackProject {
  id: string;
  name: string;
}

// Сервис
export const IntegrationsService = {
  // DefectDojo
  async getDefectDojoProducts(): Promise<DefectDojoProduct[]> {
    const { data } = await api.get<DefectDojoProduct[]>(
      "/integrations/defectdojo/products"
    );
    return data;
  },

  // Jira
  async createJiraIssue(payload: JiraIssuePayload) {
    const { data } = await api.post("/integrations/jira/issue", payload);
    return data;
  },

  // Dependency-Track
  async getDependencyTrackProjects(): Promise<DependencyTrackProject[]> {
    const { data } = await api.get<DependencyTrackProject[]>(
      "/integrations/dependency-track/projects"
    );
    return data;
  },

  async exportDependencyTrackToDefectDojo(projectId: string) {
    const { data } = await api.post("/integrations/dependency-track/export", {
      projectId,
    });
    return data;
  },
};
