// services/vulnerabilities.service.ts
import { api } from "./api";

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

export interface FindingVulnerabilityId {
  vulnerability_id?: string | null;
}

export interface VulnerabilityFinding {
  id: number;
  title: string;
  severity: string;
  description?: string;
  mitigation?: string;
  impact?: string;
  references?: string;
  steps_to_reproduce?: string;
  severity_justification?: string;
  component_name?: string | null;
  component_version?: string | null;
  file_path?: string | null;
  line?: number | null;
  cvssv3?: string;
  cvssv3_score?: number | null;
  cvssv4?: string;
  cvssv4_score?: number | null;
  cwe?: number;
  vuln_id_from_tool?: string | null;
  unique_id_from_tool?: string | null;
  vulnerability_ids?: FindingVulnerabilityId[];
  tags?: string[];
  active?: boolean;
  verified?: boolean;
  false_p?: boolean;
  duplicate?: boolean;
  out_of_scope?: boolean;
  risk_accepted?: boolean;
  is_mitigated?: boolean;
  numerical_severity?: string;
  date?: string;
  created?: string;
  updated?: string;
  mitigated?: string | null;
  display_status?: string;
  related_fields?: {
    test?: {
      title?: string;
      test_type?: { name?: string };
      engagement?: {
        name?: string;
        branch_tag?: string;
        build_id?: string;
        commit_hash?: string;
        product?: { name?: string; prod_type?: { name?: string } };
      };
    };
  };
}

export interface VulnerabilityDetail {
  finding: VulnerabilityFinding;
  status: string;
  jiraIssueKey?: string | null;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export const VulnerabilitiesService = {
  // scope: либо тип продуктов, либо конкретный продукт, либо тест (ровно одно).
  // Пагинация, поиск по title и сортировка — серверные.
  // sort: колонка с опциональным минусом ("severity" | "-id"), ровно как DD o.
  async getVulnerabilities(
    scope: { productTypeId?: number; productId?: number; testId?: number },
    page: number,
    limit: number,
    search?: string,
    sort?: string | null,
    severity?: string | null,
  ): Promise<VulnerabilityResponse> {
    const { data } = await api.get<VulnerabilityResponse>("/vulnerabilities", {
      params: {
        ...scope,
        page,
        limit,
        title: search || undefined,
        sort: sort || undefined,
        severity: severity || undefined,
      },
    });

    return data;
  },

  async getVulnerability(id: number): Promise<VulnerabilityDetail> {
    const { data } = await api.get<VulnerabilityDetail>(
      `/vulnerabilities/${id}`,
    );
    return data;
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

  async askAi(findingIds: number[], messages: AiMessage[] = []) {
    const { data } = await api.post<{ message: AiMessage }>("/vulnerabilities/ai", {
      findingIds,
      messages,
    });
    return data;
  },
};
