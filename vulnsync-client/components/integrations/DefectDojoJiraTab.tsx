"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MappingsService, JiraMapping } from "@/services/mappings.service";
import { Product } from "@/services/vulnerabilities.service";
import { toast } from "sonner";

interface Props {
  product: Product;
}

const SYSTEM_FIELDS = ["id", "createdAt", "updatedAt"] as const;

function stripSystemFields<T extends Record<string, any>>(obj: T): T {
  const copy = { ...obj };
  SYSTEM_FIELDS.forEach((f) => delete copy[f]);
  return copy;
}

export default function DefectDojoJiraTab({ product }: Props) {
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.id) {
      setMapping(null);
      setJsonText("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    MappingsService.getJiraMapping(product.id)
      .then((m) => {
        const map: JiraMapping =
          m ??
          ({
            productType: product.id,
            projectKey: "",
            issueType: "",
            fields: {},
          } as JiraMapping);

        setMapping(map);
        setJsonText(JSON.stringify(stripSystemFields(map), null, 2));
      })
      .finally(() => setLoading(false));
  }, [product?.id]);

  const save = async () => {
    if (!mapping) return;

    setSaving(true);
    setError(null);

    let payload: JiraMapping;

    try {
      payload = stripSystemFields(JSON.parse(jsonText));
    } catch {
      setError("Некорректный JSON");
      setSaving(false);
      return;
    }

    if (!payload.productType || !payload.projectKey || !payload.issueType) {
      setError("JSON должен содержать productType, projectKey и issueType");
      setSaving(false);
      return;
    }

    try {
      const saved = mapping.id
        ? await MappingsService.updateJiraMapping(mapping.id, payload)
        : await MappingsService.createJiraMapping(payload);

      setMapping(saved);
      setJsonText(JSON.stringify(stripSystemFields(saved), null, 2));

      toast.success("Маппинг Jira успешно сохранён");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить маппинг Jira");
      toast.error("Не удалось сохранить маппинг Jira");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading mapping…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Левая колонка — JSON */}
      <div className="space-y-4">
        {error && (
          <div className="p-2 text-red-700 bg-red-100 rounded-md">{error}</div>
        )}

        <Textarea
          className="font-mono min-h-[450px]"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`{
  "productType": ${product.id},
  "projectKey": "SEC",
  "issueType": "Bug",
  "fields": {
    "summary": "Test issue",
    "customfield_12345": "High",
    "customfield_54321": "Internal"
  }
}`}
        />

        <Button onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>

      {/* Правая колонка — Справка */}
      <div className="border rounded-lg p-4 bg-muted/30 text-sm space-y-3">
        <h3 className="font-semibold text-base">Справка</h3>

        <div className="space-y-2 text-muted-foreground">
          <p>
            Ниже перечислены используемые <code>customfield_*</code> и их
            назначение.
          </p>

          <ul className="list-disc list-inside space-y-1">
            <li>
              <code>customfield_12345</code> — уровень критичности уязвимости
            </li>
            <li>
              <code>customfield_23456</code> — источник обнаружения (Scanner /
              Manual)
            </li>
            <li>
              <code>customfield_34567</code> — среда (PROD / TEST)
            </li>
            <li>
              <code>customfield_45678</code> — владелец системы
            </li>
          </ul>

          <p>
            Значения передаются в Jira <b>без дополнительной обработки</b>.
          </p>
        </div>
      </div>
    </div>
  );
}
