"use client";

import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import { IntegrationsService } from "@/services/integrations.service";
import {
  Product,
  VulnerabilitiesService,
  Vulnerability,
} from "@/services/vulnerabilities.service";
import { useEffect, useState } from "react";

export default function VulnerabilitiesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем только список продуктов
  useEffect(() => {
    IntegrationsService.getDefectDojoProducts()
      .then(setProducts)
      .catch((err) => {
        setError(`Failed to load products: ${err}`);
      })
      .catch(console.error);
  }, []);

  const loadVulnerabilities = (productId: string) => {
    setSelectedProduct(productId);
    setLoading(true);
    VulnerabilitiesService.getVulnerabilities(productId)
      .then((data) => {
        const withProductId = data.map((v) => ({ ...v, productId }));
        setVulns(withProductId);
      })
      .catch((err) => {
        setError(`Failed to load vulnerabilities: ${err}`);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex gap-6">
      {/* Сайдбар с продуктами */}
      <ul className="w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        {products.map((p) => (
          <li
            key={p?.id}
            className={`p-2 rounded cursor-pointer text-sm font-medium ${
              selectedProduct === p?.id
                ? "bg-neutral-600 text-white"
                : "hover:bg-muted"
            }`}
            onClick={() => loadVulnerabilities(p?.id)}
          >
            {p?.name}
          </li>
        ))}
      </ul>

      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Уязвимости</h1>

        {loading ? (
          <div>Загружаем уязвимости…</div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
        ) : !selectedProduct ? (
          <div className="text-neutral-500">
            Выберите продукт для работы с уязвимостями
          </div>
        ) : vulns.length === 0 && selectedProduct ? (
          <div>Не найдены уязвимости для выбранного продукта</div>
        ) : (
          <VulnerabilitiesTable
            data={vulns}
            columns={vulnerabilityColumns((id) =>
              setVulns((prev) =>
                prev.map((v) => (v.id === id ? { ...v, status: "SENT" } : v))
              )
            )}
          />
        )}
      </div>
    </div>
  );
}
