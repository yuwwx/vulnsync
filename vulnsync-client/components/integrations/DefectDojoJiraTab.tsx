"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MappingsService, JiraMapping } from "@/services/mappings.service";
import { Product } from "@/services/vulnerabilities.service";

interface Props {
  product: Product;
}

export default function DefectDojoJiraTab({ product }: Props) {
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    MappingsService.getJiraMapping(product.id)
      .then((m) =>
        setMapping(
          m ?? {
            id: "",
            productType: product.id,
            projectKey: "",
            issueType: "",
            fields: {},
          }
        )
      )
      .catch((err) => setError(`Failed to load Jira mapping: ${err}`))
      .finally(() => setLoading(false));
  }, [product]);

  const updateField = (field: keyof JiraMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value });
  };

  const updateCustomField = (key: string, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, fields: { ...mapping.fields, [key]: value } });
  };

  const addCustomField = () => {
    if (!mapping) return;
    const newKey = `customField_${Object.keys(mapping.fields).length + 1}`;
    updateCustomField(newKey, "");
  };

  const save = async () => {
    if (!mapping) return;
    setSaving(true);
    setError(null);

    try {
      const saved = mapping.id
        ? await MappingsService.updateJiraMapping(mapping.id, mapping)
        : await MappingsService.createJiraMapping(mapping);
      setMapping(saved);
    } catch (err: any) {
      setError(err.message || "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading mapping…</div>;
  if (error)
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
    );

  if (!mapping) return <div>No mapping data</div>;

  return (
    <div className="space-y-2 max-w-xl">
      <div>
        <label>Project Key</label>
        <Input
          value={mapping.projectKey}
          onChange={(e) => updateField("projectKey", e.target.value)}
        />
      </div>

      <div>
        <label>Issue Type</label>
        <Input
          value={mapping.issueType}
          onChange={(e) => updateField("issueType", e.target.value)}
        />
      </div>

      {Object.entries(mapping.fields).map(([key, value]) => (
        <div key={key}>
          <label>{key}</label>
          <Input
            value={value as string}
            onChange={(e) => updateCustomField(key, e.target.value)}
          />
        </div>
      ))}

      <Button onClick={addCustomField}>Add Custom Field</Button>
      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Mapping"}
      </Button>
    </div>
  );
}
