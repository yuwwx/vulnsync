// services/mappings.service.ts
import { api } from "./api";

export interface JiraMapping {
  id: string;
  productType: string;
  projectKey: string;
  issueType: string;
  fields: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DependencyTrackMapping {
  id?: string;
  productId: string;
  dtProject: string;
  ddProduct: string;
}

export const MappingsService = {
  async getJiraMapping(productType: string): Promise<JiraMapping | null> {
    try {
      const { data } = await api.get<JiraMapping[]>(`/mappings/jira`, {
        params: { productType },
      });
      return data.length ? data[0] : null;
    } catch (err) {
      console.error("Failed to fetch Jira mapping:", err);
      return null;
    }
  },

  async createJiraMapping(mapping: Partial<JiraMapping>): Promise<JiraMapping> {
    const { data } = await api.post<JiraMapping>("/mappings/jira", mapping);
    return data;
  },

  async updateJiraMapping(
    id: string,
    mapping: Partial<JiraMapping>
  ): Promise<JiraMapping> {
    const { data } = await api.patch<JiraMapping>(
      `/mappings/jira/${id}`,
      mapping
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

  async getDependencyTrackMapping(productId: string) {
    const { data } = await api.get(`/mappings/dependency-track/${productId}`);
    return data as DependencyTrackMapping | null;
  },

  async createDependencyTrackMapping(mapping: DependencyTrackMapping) {
    const { data } = await api.post("/mappings/dependency-track", mapping);
    return data as DependencyTrackMapping;
  },

  async updateDependencyTrackMapping(
    id: string,
    mapping: DependencyTrackMapping
  ) {
    const { data } = await api.patch(
      `/mappings/dependency-track/${id}`,
      mapping
    );
    return data as DependencyTrackMapping;
  },
};
