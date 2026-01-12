"use client";

import { useEffect, useState } from "react";
import { MappingsService, JiraMapping } from "@/services/mappings.service";
import {
  VulnerabilitiesService,
  Product,
} from "@/services/vulnerabilities.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DefectDojoJiraTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [mapping, setMapping] = useState<JiraMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем список продуктов
  useEffect(() => {
    VulnerabilitiesService.getProducts().then(setProducts).catch(console.error);
  }, []);

  // Загружаем маппинг при выборе продукта
  useEffect(() => {
    if (!selectedProduct) return;
    setLoading(true);
    MappingsService.getJiraMapping(selectedProduct)
      .then((m) =>
        setMapping(
          m ?? {
            id: "",
            productType: selectedProduct,
            projectKey: "",
            issueType: "",
            fields: {},
          }
        )
      )
      .finally(() => setLoading(false));
  }, [selectedProduct]);

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
    try {
      const saved = mapping.id
        ? await MappingsService.updateJiraMapping(mapping.id, mapping)
        : await MappingsService.createJiraMapping(mapping);
      setMapping(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Сайдбар продуктов */}
      <ul className="w-48 border rounded-md p-2 space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className={`p-2 rounded cursor-pointer ${
              selectedProduct === p.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setSelectedProduct(p.id)}
          >
            {p.name}
          </li>
        ))}
      </ul>

      {/* Форма настройки маппинга */}
      <div className="flex-1 space-y-4">
        {loading ? (
          <div>Loading mapping…</div>
        ) : mapping ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">DefectDojo → Jira Mapping</h2>

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

            {/* Кастомные поля */}
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
        ) : (
          <div>Select a product to configure mapping</div>
        )}
      </div>
    </div>
  );
}
