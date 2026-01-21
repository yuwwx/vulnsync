// app/integrations/page.tsx
"use client";

import DefectDojoJiraTab from "@/components/integrations/DefectDojoJiraTab";
import DependencyTrackTab from "@/components/integrations/DependencyTrackTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DefectDojoProduct,
  IntegrationsService,
} from "@/services/integrations.service";
import { useEffect, useState } from "react";

export default function IntegrationsPage() {
  const [products, setProducts] = useState<DefectDojoProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "defectDojoJira" | "dependencyTrack"
  >("defectDojoJira");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружаем список продуктов
  useEffect(() => {
    IntegrationsService.getDefectDojoProductTypes()
      .then(setProducts)
      .catch((err) =>
        setError(`Не удалось получить типы продуктов из DefectDojo: ${err}`),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex gap-6">
      {/* Сайдбар продуктов */}
      <ul className="w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        {products.map((p) => (
          <li
            key={p.id}
            className={`p-2 rounded cursor-pointer text-sm font-medium ${
              selectedProduct === p.id
                ? "bg-neutral-600 text-white"
                : "hover:bg-muted"
            }`}
            onClick={() => {
              setSelectedProduct(p.id);
            }}
          >
            {p.name}
          </li>
        ))}
      </ul>

      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Интеграции</h1>
        {loading ? (
          <div>Загружаем продукты…</div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
        ) : !selectedProduct ? (
          <div className="text-neutral-500">
            Выберите продукт для настройки интеграций
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
          >
            <TabsList>
              <TabsTrigger value="defectDojoJira">
                DefectDojo → Jira
              </TabsTrigger>
              <TabsTrigger value="dependencyTrack">
                DependencyTrack → DefectDojo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="defectDojoJira">
              {selectedProduct && (
                <DefectDojoJiraTab
                  product={products.find((p) => p.id === selectedProduct)!}
                />
              )}
            </TabsContent>

            <TabsContent value="dependencyTrack">
              {selectedProduct && (
                <DependencyTrackTab
                  product={products.find((p) => p.id === selectedProduct)!}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
