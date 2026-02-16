"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";
import {
  DefectDojoProduct,
  DefectDojoProductType,
  IntegrationsService,
} from "@/services/integrations.service";
import {
  DependencyTrackMapping,
  MappingsService,
} from "@/services/mappings.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Props {
  productType: DefectDojoProductType;
}

const SYSTEM_FIELDS = ["id", "ddProductId", "createdAt", "updatedAt"] as const;

function stripSystemFields<T extends Record<string, any>>(obj: T): T {
  const copy = { ...obj };
  SYSTEM_FIELDS.forEach((f) => delete copy[f]);
  return copy;
}

export default function DependencyTrackTab({ productType }: Props) {
  const [mapping, setMapping] = useState<DependencyTrackMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<DefectDojoProduct[]>([]);
  const [selectedDdProductId, setSelectedDdProductId] = useState<string>("");
  const { isAdmin } = useAuth();

  // 1) Загружаем продукты
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMapping(null);

    IntegrationsService.getDefectDojoProducts(productType.id)
      .then((prods) => {
        setProducts(prods);

        if (prods.length === 0) {
          setSelectedDdProductId("");
          setMapping({
            dtProjectName: "",
            ddProductId: 0,
          });
          setError("Нет продуктов в DefectDojo");
          return;
        }

        // если продукты есть - выбираем первый
        setSelectedDdProductId(String(prods[0].id));
      })
      .catch((err) =>
        setError(`Не удалось получить продукты из DefectDojo: ${err}`),
      )
      .finally(() => setLoading(false));
  }, [productType?.id]);

  // 2) Когда выбираем продукт - грузим маппинг
  useEffect(() => {
    if (!selectedDdProductId) return;

    setLoading(true);
    setError(null);

    MappingsService.getDependencyTrackMapping(Number(selectedDdProductId))
      .then((m) => {
        if (m) {
          setMapping(m);
        } else {
          setMapping({
            dtProjectName: "",
            ddProductId: Number(selectedDdProductId),
          });
        }
      })
      .catch((err) => setError(`Не удалось получить маппинг: ${err}`))
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
      await IntegrationsService.exportDependencyTrackToDefectDojo(
        Number(selectedDdProductId),
      );
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
            <SelectItem key={p.id} value={String(p.id)}>
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
      {isAdmin && (
        <div className="flex flex-col gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Экспорт…" : "Экспортировать в DefectDojo"}
          </Button>
        </div>
      )}
    </div>
  );
}
