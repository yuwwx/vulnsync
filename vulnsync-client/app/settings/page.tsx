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
import { cn } from "@/lib/utils";
import { normalizeIntegrations } from "@/mappers/integrations.mapper";
import { toast } from "sonner";

interface IntegrationUI extends IntegrationSetting {
  apiToken?: string;
  username?: string;
  password?: string;
}

type IntegrationField = {
  name: keyof IntegrationUI;
  label: string;
  type?: "text" | "password";
  placeholder?: string;
};

const INTEGRATION_FIELDS: Record<IntegrationType, IntegrationField[]> = {
  DEFECTDOJO: [
    { name: "baseUrl", label: "Base URL" },
    { name: "apiToken", label: "API Token", type: "password" },
  ],

  DEPENDENCY_TRACK: [
    { name: "baseUrl", label: "Base URL" },
    { name: "apiToken", label: "API Token", type: "password" },
  ],

  JIRA: [
    { name: "baseUrl", label: "Base URL" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
  ],
};

export default function SettingsPage() {
  const [data, setData] = useState<Record<IntegrationType, IntegrationUI>>(
    {} as any
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<IntegrationType | null>(null);
  const [activeIntegration, setActiveIntegration] =
    useState<IntegrationType>("DEFECTDOJO");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SettingsService.getAll()
      .then((list) => {
        const normalized = normalizeIntegrations(list);
        const withInput = Object.fromEntries(
          Object.entries(normalized).map(([type, setting]) => [
            type,
            {
              ...setting,
              type,
              apiToken: "",
              username: "",
              password: "",
            },
          ])
        );
        setData(withInput as any);
      })
      .catch(() => {
        setError("Failed to load integration settings");
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

      const payload: any = {
        id: setting.id,
        type,
      };

      for (const field of INTEGRATION_FIELDS[type]) {
        const value = (setting as any)[field.name];

        if (field.name === "apiToken") {
          if (value?.trim()) payload.apiToken = value;
        } else {
          payload[field.name] = value;
        }
      }

      const saved = await SettingsService.save(payload);

      setData((prev) => ({
        ...prev,
        [type]: { ...saved, apiToken: "" },
      }));

      toast.success(`Settings for ${type} saved`);
    } catch {
      toast.error(`Failed to save settings for ${type}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      {/* Верхние вкладки */}
      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>

        {/* === INTEGRATIONS === */}
        <TabsContent value="integrations">
          <div className="flex gap-4">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 border rounded-md p-2 space-y-1">
              {INTEGRATIONS.map(({ type, label }) => {
                const setting = data[type];
                const configured = !!setting?.baseUrl && !!setting?.hasSecret;

                return (
                  <button
                    key={type}
                    onClick={() => setActiveIntegration(type)}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted",
                      activeIntegration === type && "bg-muted font-medium"
                    )}
                  >
                    {configured ? "✅" : "❌"} {label}
                  </button>
                );
              })}
            </aside>

            {/* Content */}
            <div className="flex-1">
              {activeIntegration && (
                <Card className="max-w-xl">
                  <CardHeader>
                    <CardTitle>
                      {
                        INTEGRATIONS.find((i) => i.type === activeIntegration)
                          ?.label
                      }
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {INTEGRATION_FIELDS[activeIntegration].map((field) => (
                      <Input
                        key={field.name}
                        type={field.type ?? "text"}
                        placeholder={field.label}
                        value={
                          (data[activeIntegration] as any)?.[field.name] ?? ""
                        }
                        onChange={(e) =>
                          update(activeIntegration, field.name, e.target.value)
                        }
                      />
                    ))}

                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(data[activeIntegration], null, 2)}
                    </pre>

                    <Button
                      onClick={() => save(activeIntegration)}
                      disabled={saving === activeIntegration}
                    >
                      {saving === activeIntegration ? "Saving…" : "Save"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* === PERSONAL === */}
        <TabsContent value="personal">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Personal settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Здесь могут быть настройки профиля, пароль, email и т.д.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
