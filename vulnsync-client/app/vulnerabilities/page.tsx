"use client";

import { useEffect, useState } from "react";
import {
  VulnerabilitiesService,
  Product,
  Vulnerability,
} from "@/services/vulnerabilities.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntegrationsService } from "@/services/integrations.service";

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
        setError("Failed to load products.");
      })
      .catch(console.error);
  }, []);

  // Функция для явного запроса уязвимостей
  const loadVulnerabilities = (productId: string) => {
    setSelectedProduct(productId);
    setLoading(true);
    VulnerabilitiesService.getVulnerabilities(productId)
      .then(setVulns)
      .catch((err) => {
        setError("Failed to load products.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex gap-6">
      {/* Сайдбар с продуктами */}
      <ul className="w-48 border rounded-md p-2 space-y-2">
        {products.map((p) => (
          <li
            key={p?.id}
            className={`p-2 rounded cursor-pointer ${
              selectedProduct === p?.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => loadVulnerabilities(p?.id)}
          >
            {p?.name}
          </li>
        ))}
      </ul>

      {/* Основной контент — таблица уязвимостей */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Vulnerabilities</h1>
        {error && (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
        )}

        {loading ? (
          <div>Loading vulnerabilities…</div>
        ) : vulns.length === 0 && selectedProduct ? (
          <div>No vulnerabilities found for this product.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {vulns.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>
                    <SeverityBadge severity={v.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={v.status === "SENT"}
                      onClick={() =>
                        VulnerabilitiesService.sendToJira(v.id).then(() => {
                          setVulns((prev) =>
                            prev.map((item) =>
                              item.id === v.id
                                ? { ...item, status: "SENT" }
                                : item
                            )
                          );
                        })
                      }
                    >
                      Send to Jira
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Low: "bg-green-200 text-green-800",
    Medium: "bg-yellow-200 text-yellow-800",
    High: "bg-orange-200 text-orange-800",
    Critical: "bg-red-200 text-red-800",
  };
  return (
    <Badge className={colors[severity] ?? "bg-gray-200"}>{severity}</Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SENT: "bg-blue-200 text-blue-800",
    NOT_SENT: "bg-gray-200 text-gray-800",
  };
  return <Badge className={colors[status] ?? "bg-gray-200"}>{status}</Badge>;
}
