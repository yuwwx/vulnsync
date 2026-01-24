"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReferenceLayout } from "@/components/reference/ReferenceLayout";
import {
  DefectDojoProductType,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";

export default function DefectDojoProductTypesPage() {
  const [data, setData] = useState<DefectDojoProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DefectDojoReferenceService.getProductTypes()
      .then(setData)
      .catch(() => toast.error("Не удалось загрузить product types"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReferenceLayout<DefectDojoProductType>
      title="DefectDojo · Типы продуктов"
      description="Список типов продуктов DefectDojo"
      data={data}
      loading={loading}
      columns={[
        { key: "id", label: "ID", mono: true, width: "120px" },
        { key: "name", label: "Название" },
        { key: "description", label: "Описание" },
      ]}
    />
  );
}
