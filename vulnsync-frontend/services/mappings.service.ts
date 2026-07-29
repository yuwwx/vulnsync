// services/mappings.service.ts
import { api } from "./api";
import axios from "axios";

export interface JiraMapping {
  id: string;
  fields: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  ddProductTypeId?: number;
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
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

  async getDependencyTrackMapping(
    ddProductId: number,
  ): Promise<DependencyTrackMapping | null> {
    try {
      const { data } = await api.get<DependencyTrackMapping>(
        `/mappings/dependency-track`,
        {
        params: { ddProductId },
        },
      );

      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async createDependencyTrackMapping(
    mapping: DependencyTrackMapping,
  ): Promise<DependencyTrackMapping> {
    const { data } = await api.post<DependencyTrackMapping>(
      "/mappings/dependency-track",
      mapping,
    );
    return data;
  },

  async updateDependencyTrackMapping(
    id: string,
    mapping: DependencyTrackMapping,
  ): Promise<DependencyTrackMapping> {
    const { data } = await api.patch<DependencyTrackMapping>(
      `/mappings/dependency-track/${id}`,
      mapping,
    );
    return data;
  },
};
