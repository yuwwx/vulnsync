// services/mappings.service.ts
import { api } from "./api";

export interface JiraMapping {
  id: string;
  fields: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DependencyTrackMapping {
  id?: string;
  dtProjectName: string;
  ddProductId: number;
}

export const MappingsService = {
  async getJiraMapping(ddProductTypeId: number): Promise<JiraMapping | null> {
    try {
      const { data } = await api.get<JiraMapping>(`/mappings/jira`, {
        params: { ddProductTypeId },
      });

      return data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async createJiraMapping(mapping: Partial<JiraMapping>): Promise<JiraMapping> {
    const { data } = await api.post<JiraMapping>("/mappings/jira", mapping);
    return data;
  },

  async updateJiraMapping(
    id: string,
    mapping: Partial<JiraMapping>,
  ): Promise<JiraMapping> {
    const { data } = await api.patch<JiraMapping>(
      `/mappings/jira/${id}`,
      mapping,
    );
    return data;
  },

  async deleteJiraMapping(id: string): Promise<void> {
    await api.delete(`/mappings/jira/${id}`);
  },

  async getAllJiraMappings(): Promise<JiraMapping[]> {
    const { data } = await api.get<JiraMapping[]>("/mappings/jira");
    return data;
  },

  async getDependencyTrackMapping(ddProductId: number) {
    try {
      const { data } = await api.get(`/mappings/dependency-track`, {
        params: { ddProductId },
      });

      return data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async createDependencyTrackMapping(mapping: DependencyTrackMapping) {
    const { data } = await api.post("/mappings/dependency-track", mapping);
    return data as DependencyTrackMapping;
  },

  async updateDependencyTrackMapping(
    id: string,
    mapping: DependencyTrackMapping,
  ) {
    const { data } = await api.patch(
      `/mappings/dependency-track/${id}`,
      mapping,
    );
    return data as DependencyTrackMapping;
  },
};
