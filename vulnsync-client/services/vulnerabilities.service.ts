// services/vulnerabilities.service.ts
import { api } from "./api";

export interface Product {
  id: string;
  name: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  status: "SENT" | "NOT_SENT";
  productId: string;
}

export const VulnerabilitiesService = {
  async getVulnerabilities(productId: string): Promise<Vulnerability[]> {
    const { data } = await api.get<Vulnerability[]>(
      `/vulnerabilities?productId=${productId}`
    );
    return data;
  },

  async sendToJira(vulnId: string) {
    return api.post(`/vulnerabilities/${vulnId}/jira`);
  },
};
