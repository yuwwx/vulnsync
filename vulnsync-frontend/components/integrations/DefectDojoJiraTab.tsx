"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DefectDojoProductType } from "@/services/integrations.service";
import { JiraMapping, MappingsService } from "@/services/mappings.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  product: DefectDojoProductType;
}

const SYSTEM_FIELDS = [
  "id",
  "ddProductTypeId",
  "createdAt",
  "updatedAt",
] as const;

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

    MappingsService.getJiraMapping(Number(product.id))
      .then((map) => {
        setMapping(map);
        setJsonText(map ? JSON.stringify(stripSystemFields(map), null, 2) : "");
      })
      .catch((err: any) => {
        setError(err.message || "Не удалось загрузить маппинг");
      })
      .finally(() => setLoading(false));
  }, [product?.id]);

  const save = async () => {
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

    console.log(jsonText);

    if (!payload.fields.project || !payload.fields.issuetype) {
      setError("JSON должен содержать project и issuetype");
      setSaving(false);
      return;
    }

    payload.ddProductTypeId = product?.id;

    try {
      const saved = mapping?.id
        ? await MappingsService.updateJiraMapping(mapping?.id, payload)
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
    <div className="mt-2 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Левая колонка — JSON */}
      <div className="space-y-4">
        {error && (
          <div className="p-2 text-red-700 bg-red-100 rounded-md">{error}</div>
        )}
        {!mapping && (
          <div className="text-sm text-muted-foreground">
            Маппинг ещё не создан — будет создан при сохранении
          </div>
        )}
        <Textarea
          className="font-mono min-h-[450px]"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`{
  "fields": {
    "issuetype": { "id": "10007" },
    "project": { "key": "RETAIL" },
    "summary": "Название",
    "description": "Описание",
    "customfield_13900": [{ "key": "ORG-145" }],
    "customfield_10002": "RETAIL-46609",
    "components": [{ "name": "08 СБОЛ" }],
    "customfield_13902": [{ "key": "ORG-14" }],
    "customfield_13901": [{ "key": "ORG-14" }],
    "customfield_10701": { "value": "ИФТ" },
    "customfield_14401": [{ "key": "CMDB-6047" }],
    "customfield_11308": { "value": "Средний" }
  }
}`}
        />

        <Button onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30 text-sm space-y-3">
        <h3 className="font-semibold text-base">Справка</h3>

        <div className="space-y-2 text-muted-foreground">
          <p>
            Ниже перечислены часто используемые <code>customfield_*</code> и их
            назначение.
          </p>

          <ul className="list-disc list-inside space-y-1">
            <li>
              <code>customfield_10002</code> — Epic Link
            </li>
            <li>
              <code>customfield_10701</code> — Место первичного обнаружения
              дефекта
            </li>
            <li>
              <code>customfield_11308</code> — Критичность
            </li>
            <li>
              <code>customfield_13900</code> — Компания заказчика
            </li>
            <li>
              <code>customfield_13901</code> — Команда исполнитель
            </li>
            <li>
              <code>customfield_13902</code> — Команда владелец
            </li>
            <li>
              <code>customfield_14401</code> — Канал
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
