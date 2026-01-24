"use client";

import { ReferenceLayout } from "@/components/reference/ReferenceLayout";
import {
  DefectDojoProduct,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DefectDojoProductsPage() {
  const [data, setData] = useState<DefectDojoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DefectDojoReferenceService.getProducts()
      .then((res) => {
        setData(res);
      })
      .catch(() => {
        toast.error("Не удалось загрузить продукты DefectDojo");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReferenceLayout<DefectDojoProduct>
      title="DefectDojo · Продукты"
      description="Список продуктов DefectDojo"
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
