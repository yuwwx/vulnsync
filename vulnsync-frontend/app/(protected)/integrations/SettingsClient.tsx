"use client";

import { DEFAULT_AI_SYSTEM_PROMPT } from "@/constants/ai-prompt";
import { INTEGRATIONS, IntegrationType } from "@/constants/integrations";
import {
  IntegrationSetting,
  SettingsService,
} from "@/services/settings.service";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";
import { normalizeIntegrations } from "@/mappers/integrations.mapper";
import { ProductsService } from "@/services/products.service";
import { toast } from "sonner";

interface IntegrationUI extends IntegrationSetting {
  apiToken?: string;
  username?: string;
  password?: string;
  severityCustomField?: string;
  cvssCustomField?: string;
  vulnerabilityIdCustomField?: string;
  systemPrompt?: string;
  model?: string;
}

type IntegrationField = {
  name:
    | "baseUrl"
    | "apiToken"
    | "username"
    | "password"
    | "severityCustomField"
    | "cvssCustomField"
    | "vulnerabilityIdCustomField"
    | "systemPrompt"
    | "model";
  label: string;
  type?: "text" | "password";
  placeholder?: string;
};

type IntegrationPayload = Omit<Partial<IntegrationSetting>, "baseUrl"> & {
  type: IntegrationType;
  baseUrl: string;
};

const EMPTY_INTEGRATIONS = {} as Record<IntegrationType, IntegrationUI>;

const INTEGRATION_FIELDS: Record<IntegrationType, IntegrationField[]> = {
  ML: [
    {
      name: "baseUrl",
      label: "ML URL",
      placeholder: "https://api.ml.company.com",
    },
    { name: "apiToken", label: "ML Token", type: "password" },
    { name: "model", label: "Модель ML", placeholder: "Qwen3.6-Plus" },
    { name: "systemPrompt", label: "Системный промпт" },
  ],
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
    {
      name: "severityCustomField",
      label: "Severity custom field",
      placeholder: "customfield_15400",
    },
    {
      name: "cvssCustomField",
      label: "CVSS custom field",
      placeholder: "customfield_15500",
    },
    {
      name: "vulnerabilityIdCustomField",
      label: "Vulnerability ID custom field",
      placeholder: "customfield_15401",
    },
  ],
};

export default function SettingsPage() {
  const [data, setData] =
    useState<Record<IntegrationType, IntegrationUI>>(EMPTY_INTEGRATIONS);
  const [savedData, setSavedData] = useState<
    Partial<Record<IntegrationType, IntegrationSetting>>
  >({});
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();
  const [saving, setSaving] = useState<IntegrationType | null>(null);
  const [activeIntegration, setActiveIntegration] =
    useState<IntegrationType>("DEFECTDOJO");
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
              systemPrompt: setting.systemPrompt ?? (type === "ML" ? DEFAULT_AI_SYSTEM_PROMPT : ""),
              ...(type === "ML" && {
                model: setting.model ?? "giga_GigaChat-2-Max",
              }),
            },
          ]),
        );
        setSavedData(
          Object.fromEntries(
            list.map((setting) => [setting.type, setting]),
          ) as Partial<Record<IntegrationType, IntegrationSetting>>,
        );
        setData(withInput as Record<IntegrationType, IntegrationUI>);
      })
      .catch((err) => {
        setError(`Не удалось получить параметры: ${err}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (
    type: IntegrationType,
    field: keyof IntegrationUI,
    value: string,
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

      const payload: IntegrationPayload = {
        id: setting.id,
        type,
        baseUrl: setting.baseUrl,
        systemPrompt: setting.systemPrompt,
      };

      for (const field of INTEGRATION_FIELDS[type]) {
        const value = setting[field.name];

        if (field.name === "apiToken") {
          if (value?.trim()) payload.apiToken = value;
        } else if (field.name === "username" || field.name === "password") {
          if (value?.trim()) payload[field.name] = value;
        } else if (value !== undefined) {
          payload[field.name] = value;
        }
      }

      const saved = await SettingsService.save(payload);

      setSavedData((prev) => ({
        ...prev,
        [type]: saved,
      }));

      setData((prev) => {
        const previous = prev[type] ?? {};

        return {
          ...prev,
          [type]: {
            ...saved,
            ...previous,
            apiToken: "",
            username: previous.username ?? "",
            password: previous.password ?? "",
          },
        };
      });

      toast.success(`Settings for ${type} saved`);
    } catch (err) {
      const message = (
        err as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message || `Failed to save settings for ${type}`,
      );
    } finally {
      setSaving(null);
    }
  };

  const handleSyncWithKev = async () => {
    try {
      setSyncing(true);
      await ProductsService.syncKev();
      toast.success("Синхронизация KEV запущена");
    } catch (err) {
      toast.error("Не удалось запустить синхронизацию KEV");
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted || loading) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      <div className="flex gap-4">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border rounded-md p-2 space-y-1 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {INTEGRATIONS.map(({ type, label }) => {
            const setting = data[type];
            const configured =
              setting?.isConfigured ??
              (!!setting?.baseUrl && !!setting?.hasSecret);

            return (
              <button
                key={type}
                onClick={() => setActiveIntegration(type)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted",
                  activeIntegration === type && "bg-muted font-medium",
                )}
              >
                {configured ? "✅" : "❌"} {label}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 gap-3 items-start">
            {activeIntegration && (
              <Card className="min-w-0 w-full max-w-3xl">
                <CardHeader>
                  <CardTitle>
                    {
                      INTEGRATIONS.find((i) => i.type === activeIntegration)
                        ?.label
                    }
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {INTEGRATION_FIELDS[activeIntegration].map((field) =>
                    field.name === "systemPrompt" ? (
                      <textarea
                        key={field.name}
                        className="box-border min-h-64 w-full max-w-full resize-y overflow-x-hidden break-words rounded-md border bg-transparent p-3 text-sm"
                        placeholder={field.label}
                        value={data[activeIntegration]?.[field.name] ?? ""}
                        onChange={(e) =>
                          update(activeIntegration, field.name, e.target.value)
                        }
                      />
                    ) : (
                      <Input
                        key={field.name}
                        type={field.type ?? "text"}
                        placeholder={field.label}
                        value={data[activeIntegration]?.[field.name] ?? ""}
                        onChange={(e) =>
                          update(activeIntegration, field.name, e.target.value)
                        }
                      />
                    ),
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Сохранённое состояние
                    </h3>
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                      {savedData[activeIntegration]
                        ? JSON.stringify(savedData[activeIntegration], null, 2)
                        : "Нет сохранённой настройки"}
                    </pre>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      onClick={() => save(activeIntegration)}
                      disabled={saving === activeIntegration}
                    >
                      {saving === activeIntegration
                        ? "Сохранение..."
                        : "Сохранить"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {activeIntegration === "DEPENDENCY_TRACK" && (
              <Card className="max-w-sm">
                <CardHeader>
                  <CardTitle>Синхронизация с KEV</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="mb-5">
                    Создается новая политика с текущей датой в названии и
                    указанием всем CVE из базы KEV
                  </div>
                  <Button
                    className="w-full"
                    disabled={syncing}
                    onClick={handleSyncWithKev}
                  >
                    {syncing ? "Запуск..." : "Синхронизировать"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
