// services/vulnerabilities.service.ts
import { api } from "./api";

export interface ProductType {
  id: number;
  name: string;
}

export interface Vulnerability {
  id: number;
  title: string;
  severity: string;
  status: string;
  cvssv3_score?: number;
  cvssv4_score?: number;
  product?: string;
  creation_date: string;
  jiraIssueKey?: string;
}

export interface VulnerabilityResponse {
  data: Vulnerability[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface JiraDescriptionResponse {
  description: string;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export const VulnerabilitiesService = {
  async getVulnerabilities(
    productId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<VulnerabilityResponse> {
    const { data } = await api.get<VulnerabilityResponse>(
      `/vulnerabilities/${productId}`,
      {
        params: {
          page,
          limit,
          title: search || undefined,
        },
      },
    );

    return data;
  },

  async sendToJira(vulnId: string) {
    return api.post(`/vulnerabilities/${vulnId}/jira`);
  },

  async previewJiraDescription(
    findingIds: number[],
  ): Promise<JiraDescriptionResponse> {
    const { data } = await api.post<JiraDescriptionResponse>(
      "/vulnerabilities/description",
      {
      findingIds,
      },
    );

    return data;
  },

  async changeSeverity(findingId: number, severity: string) {
    const { data } = await api.patch<Vulnerability>(
      `/integrations/defectdojo/finding/${findingId}/severity`,
      { severity },
    );

    return data;
  },

  async askAi(findingIds: number[], messages: AiMessage[] = []) {
    const { data } = await api.post<{ message: AiMessage }>("/vulnerabilities/ai", {
      findingIds,
      messages,
    });
    return data;
  },
};
