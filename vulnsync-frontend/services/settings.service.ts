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
}

export const SettingsService = {
  async getAll(): Promise<IntegrationSetting[]> {
    const { data } = await api.get("/settings/integrations");
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
      };

      const { data } = await api.patch(
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
        type: setting?.type,
      };

      const { data } = await api.post("/settings/integrations", payload);
      return data;
    }
  },
};
