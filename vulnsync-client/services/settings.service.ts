// services/settings.service.ts
import { api } from "./api";

export interface IntegrationSetting {
  id?: string;
  type: string;
  baseUrl: string;
  apiToken?: string;
}

export const SettingsService = {
  async getAll(): Promise<IntegrationSetting[]> {
    const { data } = await api.get("/settings/integrations");
    return data;
  },

  async save(setting: IntegrationSetting) {
    if (setting.id) {
      const { data } = await api.patch(
        `/settings/integrations/${setting.id}`,
        setting
      );
      return data;
    }

    const { data } = await api.post("/settings/integrations", setting);
    return data;
  },
};
