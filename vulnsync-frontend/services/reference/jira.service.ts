import { api } from "../api";
import { JiraCustomField, JiraProject } from "@/types/jira";

export const JiraReferenceService = {
  async getProjects(): Promise<JiraProject[]> {
    const { data } = await api.get<JiraProject[]>(
      "/integrations/jira/projects",
    );
    return data;
  },

  async getCustomFields(): Promise<JiraCustomField[]> {
    const { data } = await api.get<JiraCustomField[]>(
      "/integrations/jira/custom-fields",
    );
    return data;
  },
};
