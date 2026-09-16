// app/products/page.tsx
"use client";

import DefectDojoJiraTab from "@/components/products/DefectDojoJiraTab";
import DependencyTrackTab from "@/components/products/DependencyTrackTab";
import EngagementNotificationsTab from "@/components/products/EngagementNotificationsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DefectDojoProductType,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";
import { useEffect, useState } from "react";

type ProductTab =
  | "defectDojoJira"
  | "dependencyTrack"
  | "engagementNotifications";

export default function ProductsPage() {
  const [products, setProducts] = useState<DefectDojoProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [activeTab, setActiveTab] =
    useState<ProductTab>("defectDojoJira");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружаем список продуктов
  useEffect(() => {
    DefectDojoReferenceService.getProductTypes()
      .then(setProducts)
      .catch((err) =>
        setError(`Не удалось получить типы продуктов из DefectDojo: ${err}`),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex gap-6">
      <ul className="min-w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
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
        {loading ? (
          <div>Загружаем продукты…</div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
        ) : !selectedProduct ? (
          <div className="text-neutral-500">
            Выберите продукт для настройки
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (
                value === "defectDojoJira" ||
                value === "dependencyTrack" ||
                value === "engagementNotifications"
              ) {
                setActiveTab(value);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="defectDojoJira">
                Маппинг DefectDojo → Jira
              </TabsTrigger>
              <TabsTrigger value="dependencyTrack">
                Маппинг DependencyTrack → DefectDojo
              </TabsTrigger>
              <TabsTrigger value="engagementNotifications">
                Уведомления об уязвимостях
              </TabsTrigger>
            </TabsList>

            <TabsContent value="defectDojoJira">
              {selectedProduct && (
                <DefectDojoJiraTab
                  productType={products.find((p) => p.id === selectedProduct)!}
                />
              )}
            </TabsContent>

            <TabsContent value="dependencyTrack">
              {selectedProduct && (
                <DependencyTrackTab
                  productType={products.find((p) => p.id === selectedProduct)!}
                />
              )}
            </TabsContent>

            <TabsContent value="engagementNotifications">
              {selectedProduct && (
                <EngagementNotificationsTab
                  productType={products.find((p) => p.id === selectedProduct)!}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
