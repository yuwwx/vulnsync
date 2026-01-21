// services/vulnerabilities.service.ts
import { api } from "./api";

export interface ProductType {
  id: number;
  name: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: "SENT" | "NOT_SENT";
  productId: number;
  findingId: number;
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
};
