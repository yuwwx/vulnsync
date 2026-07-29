import { api } from "./api";

export interface IntegrationSetting {
  id?: string;
  type: string;
  baseUrl: string;
  hasSecret?: boolean;
  isConfigured?: boolean;
  apiToken?: string;
  username?: string;
  password?: string;
  severityCustomField?: string;
  cvssCustomField?: string;
  vulnerabilityIdCustomField?: string;
}

export const SettingsService = {
  async getAll(): Promise<IntegrationSetting[]> {
    const { data } = await api.get<IntegrationSetting[]>(
      "/settings/integrations",
    );
    return data;
  },

  async save(setting: IntegrationSetting) {
    if (setting.id) {
      const payload = {
        baseUrl: setting.baseUrl,
        apiToken: setting?.apiToken,
        username: setting?.username,
        password: setting?.password,
        severityCustomField: setting?.severityCustomField,
        cvssCustomField: setting?.cvssCustomField,
        vulnerabilityIdCustomField: setting?.vulnerabilityIdCustomField,
      };

      const { data } = await api.patch<IntegrationSetting>(
        `/settings/integrations/${setting.id}`,
        payload,
      );
      return data;
    } else {
      const payload = {
        baseUrl: setting.baseUrl,
        apiToken: setting?.apiToken,
        username: setting?.username,
        password: setting?.password,
        severityCustomField: setting?.severityCustomField,
        cvssCustomField: setting?.cvssCustomField,
        vulnerabilityIdCustomField: setting?.vulnerabilityIdCustomField,
        type: setting?.type,
      };

      const { data } = await api.post<IntegrationSetting>(
        "/settings/integrations",
        payload,
      );
      return data;
    }
  },
};
