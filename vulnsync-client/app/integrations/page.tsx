// app/integrations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  VulnerabilitiesService,
  Product,
} from "@/services/vulnerabilities.service";
import { IntegrationsService } from "@/services/integrations.service";
import DefectDojoJiraTab from "@/components/integrations/DefectDojoJiraTab";
import DependencyTrackTab from "@/components/integrations/DependencyTrackTab";

export default function IntegrationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "defectDojoJira" | "dependencyTrack"
  >("defectDojoJira");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружаем список продуктов
  useEffect(() => {
    IntegrationsService.getDefectDojoProducts()
      .then(setProducts)
      .catch((err) => setError(`Failed to load products: ${err}`))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Основной контент */}
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold mb-4">Integrations</h1>

        {loading ? (
          <div>Loading products…</div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
        ) : !selectedProduct ? (
          <div className="text-gray-500">
            Select a product to configure integrations.
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
              <DefectDojoJiraTab productId={selectedProduct} />
            </TabsContent>

            <TabsContent value="dependencyTrack">
              <DependencyTrackTab productId={selectedProduct} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
