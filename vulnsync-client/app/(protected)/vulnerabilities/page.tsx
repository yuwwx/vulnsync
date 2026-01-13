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
import { toast } from "sonner";

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
      .then(setVulns)
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Критичность</TableHead>
                  <TableHead>Состояние</TableHead>
                  <TableHead>Действие</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {vulns.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.id}</TableCell>
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
                        onClick={async () => {
                          try {
                            await IntegrationsService.createJiraIssue({
                              findingId: v.id,
                              productId: String(selectedProduct),
                            });

                            setVulns((prev) =>
                              prev.map((item) =>
                                item.id === v.id
                                  ? { ...item, status: "SENT" }
                                  : item
                              )
                            );

                            toast.success("Jira issue created successfully");
                          } catch (err: any) {
                            toast.error(
                              err?.response?.data?.message ||
                                "Failed to create Jira issue"
                            );
                          }
                        }}
                      >
                        Отправить в Jira
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Info: "bg-neutral-200 text-neutral-800",
    Low: "bg-green-200 text-green-800",
    Medium: "bg-yellow-200 text-yellow-800",
    High: "bg-orange-200 text-orange-800",
    Critical: "bg-red-200 text-red-800",
  };
  return (
    <Badge className={colors[severity] ?? "bg-neutral-200"}>{severity}</Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SENT: "bg-blue-200 text-blue-800",
    NOT_SENT: "bg-neutral-200 text-neutral-800",
  };
  return <Badge className={colors[status] ?? "bg-neutral-200"}>{status}</Badge>;
}
