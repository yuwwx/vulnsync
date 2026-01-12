"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MappingsService, JiraMapping } from "@/services/mappings.service";
import { Product } from "@/services/vulnerabilities.service";

interface Props {
  product: Product;
}

interface FieldRow {
  key: string;
  value: string;
  error?: string;
}

export default function DefectDojoJiraTab({ product }: Props) {
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.id) {
      setMapping(null);
      setFields([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    MappingsService.getJiraMapping(product.id)
      .then((m) => {
        const map = m ?? {
          id: "",
          productType: product.id,
          projectKey: "",
          issueType: "",
          fields: {},
        };
        setMapping(map);

        const rows: FieldRow[] = Object.entries(map.fields).map(([k, v]) => ({
          key: k,
          value: v as string,
        }));
        setFields(rows);
      })
      .catch((err) => setError(`Failed to load Jira mapping: ${err}`))
      .finally(() => setLoading(false));
  }, [product?.id]);

  const updateField = (field: keyof JiraMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value });
  };

  const updateRowKey = (index: number, key: string) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index].key = key;
      copy[index].error = undefined;
      return copy;
    });
  };

  const updateRowValue = (index: number, value: string) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index].value = value;
      copy[index].error = undefined;
      return copy;
    });
  };

  const addRow = () => setFields((prev) => [...prev, { key: "", value: "" }]);
  const removeRow = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    if (!mapping) return;
    setSaving(true);
    setError(null);

    let hasError = false;

    // Проверка обязательных полей
    const updatedFields = fields.map((f) => {
      if (!f.key.trim()) {
        hasError = true;
        return { ...f, error: "Field Name is required" };
      }
      return { ...f, error: undefined };
    });
    setFields(updatedFields);

    if (!mapping.projectKey.trim() || !mapping.issueType.trim()) {
      hasError = true;
    }

    if (hasError) {
      setSaving(false);
      return;
    }

    // Формируем payload
    const fieldsObj: Record<string, string> = {};
    updatedFields.forEach((f) => (fieldsObj[f.key] = f.value));

    const payload: JiraMapping = {
      projectKey: mapping.projectKey,
      issueType: mapping.issueType,
      productType: mapping.productType,
      fields: fieldsObj,
    };

    try {
      const saved = mapping.id
        ? await MappingsService.updateJiraMapping(mapping.id, payload)
        : await MappingsService.createJiraMapping(payload);

      setMapping(saved);

      const rows: FieldRow[] = Object.entries(saved.fields).map(([k, v]) => ({
        key: k,
        value: v as string,
      }));
      setFields(rows);
    } catch (err: any) {
      setError(err.message || "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading mapping…</div>;

  return (
    <div className="space-y-4 max-w-xl">
      {error && (
        <div className="p-2 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      <div>
        <label className="font-medium">Project Key</label>
        <Input
          value={mapping?.projectKey ?? ""}
          onChange={(e) => updateField("projectKey", e.target.value)}
        />
        {!mapping?.projectKey.trim() && (
          <p className="text-xs text-destructive mt-1">
            Project Key is required
          </p>
        )}
      </div>

      <div>
        <label className="font-medium">Issue Type</label>
        <Input
          value={mapping?.issueType ?? ""}
          onChange={(e) => updateField("issueType", e.target.value)}
        />
        {!mapping?.issueType.trim() && (
          <p className="text-xs text-destructive mt-1">
            Issue Type is required
          </p>
        )}
      </div>

      {/* Таблица полей через Shadcn Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {fields.map((f, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input
                  placeholder="Field Name"
                  value={f.key}
                  onChange={(e) => updateRowKey(i, e.target.value)}
                />
                {f.error && (
                  <p className="text-xs text-destructive mt-1">{f.error}</p>
                )}
              </TableCell>

              <TableCell>
                <Input
                  placeholder="Value"
                  value={f.value}
                  onChange={(e) => updateRowValue(i, e.target.value)}
                />
              </TableCell>

              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeRow(i)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <div className="mt-1">
            <Button variant="ghost" onClick={addRow}>
              + Add Field
            </Button>
          </div>
        </TableBody>
      </Table>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Mapping"}
      </Button>
    </div>
  );
}
