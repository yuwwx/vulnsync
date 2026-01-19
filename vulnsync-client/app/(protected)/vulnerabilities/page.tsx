"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VulnerabilitiesTable } from "../../../components/vulnerabilities/vulnerabilities-table";
import {
  Product,
  VulnerabilitiesService,
  Vulnerability,
} from "@/services/vulnerabilities.service";
import { IntegrationsService } from "@/services/integrations.service";
import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VulnerabilitiesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);
  const [loadingFinding, setLoadingFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [finding, setFinding] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const handleGenerateDescription = useCallback(async (vuln) => {
    setLoadingFinding(true);
    setFinding(null);

    try {
      const result = await IntegrationsService.getDefectDojoFinding(
        Number(vuln.id)
      );

      setFinding(result);
      setOpen(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load DefectDojo finding"
      );
    } finally {
      setLoadingFinding(false);
    }
  }, []);

  const columns = useMemo(
    () =>
      vulnerabilityColumns(
        (id) =>
          setVulns((prev) =>
            prev.map((v) => (v.id === id ? { ...v, status: "SENT" } : v))
          ),
        handleGenerateDescription
      ),
    [handleGenerateDescription]
  );

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
    setLoadingVulns(true);
    VulnerabilitiesService.getVulnerabilities(productId)
      .then((data) => {
        const withProductId = data.map((v) => ({ ...v, productId }));
        setVulns(withProductId);
      })
      .catch((err) => {
        setError(`Failed to load vulnerabilities: ${err}`);
      })
      .finally(() => setLoadingVulns(false));
  };

  return (
    <>
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

          {loadingVulns ? (
            <div>Загружаем уязвимости…</div>
          ) : error ? (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          ) : !selectedProduct ? (
            <div className="text-neutral-500">
              Выберите продукт для работы с уязвимостями
            </div>
          ) : vulns.length === 0 && selectedProduct ? (
            <div>Не найдены уязвимости для выбранного продукта</div>
          ) : (
            <VulnerabilitiesTable columns={columns} data={vulns} />
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Описание уязвимости</DialogTitle>
          </DialogHeader>
          {loadingFinding || !finding ? (
            <div className="text-sm text-muted-foreground">Загрузка…</div>
          ) : (
            <div className="space-y-4 text-sm flex justify-center">
              <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md max-h-[70vh] overflow-auto sm:max-w-lg">
                {JSON.stringify(finding, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
