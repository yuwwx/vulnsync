"use client";

import { useEffect, useState } from "react";
import { INTEGRATIONS, IntegrationType } from "@/constants/integrations";
import {
  SettingsService,
  IntegrationSetting,
} from "@/services/settings.service";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { normalizeIntegrations } from "@/mappers/integrations.mapper";

// Импортируем sonner
import { toast } from "sonner";

interface IntegrationUI extends IntegrationSetting {
  apiTokenInput?: string;
}

export default function SettingsPage() {
  const [data, setData] = useState<Record<IntegrationType, IntegrationUI>>(
    {} as any
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<IntegrationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SettingsService.getAll()
      .then((list) => {
        const normalized = normalizeIntegrations(list);
        const withInput = Object.fromEntries(
          Object.entries(normalized).map(([type, setting]) => [
            type,
            { ...setting, apiTokenInput: "" },
          ])
        );
        setData(withInput);

        if (!list || list.length === 0) {
          setError("No integration settings found.");
        }
      })
      .catch((err) => {
        setError(`Failed to load integration settings: ${err}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (
    type: IntegrationType,
    field: keyof IntegrationUI,
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const save = async (type: IntegrationType) => {
    setSaving(type);
    try {
      const setting = data[type];
      const payload = {
        ...setting,
        apiToken: setting.apiTokenInput?.trim() || undefined,
      };
      const saved = await SettingsService.save(payload);

      setData((prev) => ({
        ...prev,
        [type]: { ...saved, apiTokenInput: "" },
      }));

      // Показываем успешное уведомление
      toast.success(`Settings for ${type} saved successfully!`);
    } catch (err) {
      // Показываем ошибку
      toast.error(`Failed to save settings for ${type}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Tabs defaultValue={INTEGRATIONS[0].type}>
          <TabsList>
            {INTEGRATIONS.map(({ type, label }) => {
              const setting = data[type];
              const configured =
                !!setting?.baseUrl && !!setting?.hasToken ? "✅" : "❌";

              return (
                <TabsTrigger key={type} value={type}>
                  {label} {configured}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {INTEGRATIONS.map(({ type, label }) => {
            const setting = data[type];

            return (
              <TabsContent key={type} value={type}>
                <Card className="max-w-xl">
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Base URL"
                      value={setting?.baseUrl ?? ""}
                      onChange={(e) => update(type, "baseUrl", e.target.value)}
                    />

                    <Input
                      type="password"
                      placeholder="API Token"
                      value={setting?.apiTokenInput ?? ""}
                      onChange={(e) =>
                        update(type, "apiTokenInput", e.target.value)
                      }
                    />

                    <Button
                      onClick={() => save(type)}
                      disabled={saving === type}
                    >
                      {saving === type ? "Saving…" : "Save"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
