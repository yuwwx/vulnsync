"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MappingsService,
  DependencyTrackMapping,
} from "@/services/mappings.service";
import { Product } from "@/services/vulnerabilities.service";

interface Props {
  product: Product;
}

export default function DependencyTrackTab({ product }: Props) {
  const [mapping, setMapping] = useState<DependencyTrackMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    MappingsService.getDependencyTrackMapping(product.id)
      .then((m) =>
        setMapping(m ?? { productId: product.id, dtProject: "", ddProduct: "" })
      )
      .catch((err) =>
        setError(`Failed to load Dependency-Track mapping: ${err}`)
      )
      .finally(() => setLoading(false));
  }, [product]);

  const updateField = (field: keyof DependencyTrackMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value });
  };

  const save = async () => {
    if (!mapping) return;
    setSaving(true);
    setError(null);

    try {
      const saved = mapping.id
        ? await MappingsService.updateDependencyTrackMapping(
            mapping.id,
            mapping
          )
        : await MappingsService.createDependencyTrackMapping(mapping);
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
        <label>Dependency-Track Project</label>
        <Input
          value={mapping.dtProject}
          onChange={(e) => updateField("dtProject", e.target.value)}
        />
      </div>

      <div>
        <label>DefectDojo Product</label>
        <Input
          value={mapping.ddProduct}
          onChange={(e) => updateField("ddProduct", e.target.value)}
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Mapping"}
      </Button>
    </div>
  );
}
