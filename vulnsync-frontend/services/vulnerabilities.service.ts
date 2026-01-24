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
  cvssv3_score: number;
  creation_date: Date;
  jiraIssueKey?: string;
}

export const VulnerabilitiesService = {
  async getVulnerabilities(productId: number): Promise<Vulnerability[]> {
    const { data } = await api.get<Vulnerability[]>(
      `/vulnerabilities/${productId}`,
    );
    return data;
  },

  async sendToJira(vulnId: string) {
    return api.post(`/vulnerabilities/${vulnId}/jira`);
  },

  async previewJiraDescription(findingIds: number[]) {
    const { data } = await api.post("/vulnerabilities/description", {
      findingIds,
    });

    return data;
  },
};
