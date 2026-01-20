"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MappingsService,
  DependencyTrackMapping,
} from "@/services/mappings.service";
import { Product } from "@/services/vulnerabilities.service";
import { toast } from "sonner";
import { IntegrationsService } from "@/services/integrations.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Props {
  product: Product;
}

const SYSTEM_FIELDS = ["id", "ddProductId", "createdAt", "updatedAt"] as const;

function stripSystemFields<T extends Record<string, any>>(obj: T): T {
  const copy = { ...obj };
  SYSTEM_FIELDS.forEach((f) => delete copy[f]);
  return copy;
}

export default function DependencyTrackTab({ product }: Props) {
  const [mapping, setMapping] = useState<DependencyTrackMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDdProductId, setSelectedDdProductId] = useState<string>("");

  // 1) Загружаем продукты
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMapping(null);

    IntegrationsService.getDefectDojoProducts(product.id)
      .then((prods) => {
        setProducts(prods);

        if (prods.length === 0) {
          setSelectedDdProductId("");
          setMapping({
            dtProjectName: "",
            ddProductId: "",
          });
          setError("Нет продуктов в DefectDojo");
          return;
        }

        // если продукты есть - выбираем первый
        setSelectedDdProductId(prods[0].id);
      })
      .catch((err) => setError(`Failed to load products: ${err}`))
      .finally(() => setLoading(false));
  }, [product?.id]);

  // 2) Когда выбираем продукт - грузим маппинг
  useEffect(() => {
    if (!selectedDdProductId) return;

    setLoading(true);
    setError(null);

    MappingsService.getDependencyTrackMapping(selectedDdProductId)
      .then((m) => {
        if (m) {
          setMapping(m);
        } else {
          setMapping({
            dtProjectName: "",
            ddProductId: selectedDdProductId,
          });
        }
      })
      .catch((err) =>
        setError(`Failed to load Dependency-Track mapping: ${err}`),
      )
      .finally(() => setLoading(false));
  }, [selectedDdProductId]);

  const updateField = (field: keyof DependencyTrackMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value });
  };

  const handleSave = async () => {
    if (!mapping) return;
    setSaving(true);
    setError(null);

    try {
      const saved = mapping.id
        ? await MappingsService.updateDependencyTrackMapping(
            mapping.id,
            stripSystemFields(mapping),
          )
        : await MappingsService.createDependencyTrackMapping(mapping);

      setMapping(saved);
      toast.success("Маппинг Dependency-Track успешно сохранён");
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить маппинг Dependency-Track");
      toast.error("Не удалось сохранить маппинг Dependency-Track");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!mapping) return;
    setExporting(true);
    setError(null);

    try {
      await IntegrationsService.exportDependencyTrackToDefectDojo(product.id);
      toast.success("Экспорт в DefectDojo успешен");
    } catch (err: any) {
      setError(err.message || "Не удалось экспортировать в DefectDojo");
      toast.error("Не удалось экспортировать в DefectDojo");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div>Загрузка маппинга…</div>;

  return (
    <div className="mt-2 w-96 space-y-4">
      {error && (
        <div className="p-2 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      <Select
        value={selectedDdProductId}
        onValueChange={(value) => setSelectedDdProductId(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Выберите продукт DefectDojo" />
        </SelectTrigger>

        <SelectContent>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Dependency-Track Project Name"
        value={mapping?.dtProjectName || ""}
        onChange={(e) => updateField("dtProjectName", e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? "Экспорт…" : "Экспортировать в DefectDojo"}
        </Button>
      </div>
    </div>
  );
}
