import { api } from "../api";

export type DependencyTrackProject = {
  uuid: string;
  name: string;
  version: string;
  description?: string;
};

export const DependencyTrackReferenceService = {
  async getProjects(): Promise<DependencyTrackProject[]> {
    const { data } = await api.get("/integrations/dependency-track/projects");
    return data;
  },
};
