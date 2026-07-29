import { api } from "../api";

export type JiraProject = {
  id: string;
  key: string;
  name: string;
};

export type JiraCustomField = {
  id: string;
  name: string;
  schema?: {
    type?: string;
    items?: string;
  };
};

export class JiraReferenceService {
  static async getProjects(): Promise<JiraProject[]> {
    const { data } = await api.get<JiraProject[]>(
      "/integrations/jira/projects",
    );
    return data;
  }

  static async getCustomFields(): Promise<JiraCustomField[]> {
    const { data } = await api.get("/integrations/jira/custom-fields");
    return data;
  }
}
