// src/mappers/integrations.mapper.ts
import { INTEGRATIONS, IntegrationType } from "@/constants/integrations";
import { IntegrationSetting } from "@/services/settings.service";

export function normalizeIntegrations(
  list: IntegrationSetting[]
): Record<IntegrationType, IntegrationSetting> {
  const map = Object.fromEntries(list.map((item) => [item.type, item]));

  return Object.fromEntries(
    INTEGRATIONS.map(({ type }) => [type, map[type] ?? { type, baseUrl: "" }])
  ) as Record<IntegrationType, IntegrationSetting>;
}
