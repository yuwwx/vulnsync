import { api } from "./api";

export interface IntegrationSetting {
  id?: string;
  type: string;
  baseUrl: string;
  hasToken?: boolean; // приходит с бэка, не для отправки
}

export const SettingsService = {
  async getAll(): Promise<IntegrationSetting[]> {
    const { data } = await api.get("/settings/integrations");
    return data;
  },

  async save(setting: IntegrationSetting & { apiToken?: string }) {
    const payload: { baseUrl: string; apiToken?: string } = {
      baseUrl: setting.baseUrl,
    };

    if (setting.apiToken) {
      payload.apiToken = setting.apiToken;
    }

    if (setting.id) {
      const { data } = await api.patch(
        `/settings/integrations/${setting.id}`,
        payload
      );
      return data;
    }

    const { data } = await api.post("/settings/integrations", payload);
    return data;
  },
};
