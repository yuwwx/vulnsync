"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import {
  DefectDojoProduct,
  IntegrationsService,
} from "@/services/integrations.service";
import {
  VulnerabilitiesService,
  Vulnerability,
} from "@/services/vulnerabilities.service";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import { Check, Copy } from "lucide-react";

import {
  normalizeSingleFinding,
  normalizeBulkFindings,
  renderJiraDescription,
} from "@/utils/jira-description";

type FindingState =
  | { type: "single"; data: any }
  | { type: "bulk"; raw: any[] }
  | null;

export default function VulnerabilitiesPage() {
  const [products, setProducts] = useState<DefectDojoProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [selectedVulns, setSelectedVulns] = useState<Vulnerability[]>([]);

  const [loadingVulns, setLoadingVulns] = useState(false);
  const [loadingFinding, setLoadingFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [finding, setFinding] = useState<FindingState>(null);
  const [openDescription, setOpenDescription] = useState(false);
  const [openJiraLink, setOpenJiraLink] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleGenerateDescription = useCallback(async (vuln: Vulnerability) => {
    setLoadingFinding(true);

    try {
      const data = await IntegrationsService.getDefectDojoFinding(
        Number(vuln.id),
      );

      setFinding({ type: "single", data });
      setOpenDescription(true);
    } catch {
      toast.error("Не удалось загрузить уязвимость");
    } finally {
      setLoadingFinding(false);
    }
  }, []);

  const handleGenerateBulkDescription = async () => {
    setLoadingFinding(true);

    try {
      const findings = await Promise.all(
        selectedVulns.map((v) =>
          IntegrationsService.getDefectDojoFinding(Number(v.id)),
        ),
      );

      setFinding({ type: "bulk", raw: findings });
      setOpenDescription(true);
    } catch {
      toast.error("Не удалось сгенерировать описание");
    } finally {
      setLoadingFinding(false);
    }
  };

  const handleSendToJira = useCallback(async (vuln: Vulnerability) => {
    try {
      await IntegrationsService.createJiraIssue({
        findingId: vuln.findingId,
        productId: vuln.productId,
      });

      setVulns((prev) =>
        prev.map((v) => (v.id === vuln.id ? { ...v, status: "SENT" } : v)),
      );

      toast.success("Jira issue создан");
    } catch {
      toast.error("Не удалось создать Jira issue");
    }
  }, []);

  const handleLinkWithJira = () => {
    setOpenJiraLink(true);
  };

  const jiraText =
    finding?.type === "bulk"
      ? renderJiraDescription(normalizeBulkFindings(finding.raw))
      : finding?.type === "single"
        ? renderJiraDescription(normalizeSingleFinding(finding.data))
        : "";

  const columns = useMemo(
    () =>
      vulnerabilityColumns(
        handleSendToJira,
        handleLinkWithJira,
        handleGenerateDescription,
      ),
    [handleGenerateDescription],
  );

  useEffect(() => {
    IntegrationsService.getDefectDojoProductTypes()
      .then(setProducts)
      .catch(() => setError("Не удалось получить продукты из DefectDojo"));
  }, []);

  const loadVulnerabilities = (product: DefectDojoProduct) => {
    setSelectedProductId(product.id);
    setLoadingVulns(true);

    VulnerabilitiesService.getVulnerabilities(product.id)
      .then((data) =>
        setVulns(data.map((v) => ({ ...v, productId: product.id }))),
      )
      .catch(() => setError("Не удалось получить уязвимости"))
      .finally(() => setLoadingVulns(false));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jiraText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="flex gap-6">
        <ul className="min-w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {products.map((p) => (
            <li
              key={p.id}
              onClick={() => loadVulnerabilities(p)}
              className={`p-2 rounded cursor-pointer text-sm font-medium ${
                selectedProductId === p.id
                  ? "bg-neutral-600 text-white"
                  : "hover:bg-muted"
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-4">Уязвимости</h1>

          {loadingVulns ? (
            <div>Загрузка…</div>
          ) : error ? (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          ) : !selectedProductId ? (
            <div className="text-neutral-500">Выберите продукт</div>
          ) : (
            <VulnerabilitiesTable
              data={vulns}
              columns={columns}
              onSelectionChange={setSelectedVulns}
              bulkAction={{
                label: `Сгенерировать описание (${selectedVulns.length})`,
                disabled: selectedVulns.length === 0 || loadingFinding,
                onClick: handleGenerateBulkDescription,
              }}
            />
          )}
        </div>
      </div>

      <Dialog open={openDescription} onOpenChange={setOpenDescription}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Описание уязвимости</DialogTitle>
          </DialogHeader>

          {loadingFinding ? (
            <div className="text-sm text-muted-foreground">Загрузка…</div>
          ) : (
            <>
              <div className="space-y-4 text-sm">
                {jiraText.split("\n").map((line, i) => (
                  <div key={i}>{line || "\u00A0"}</div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Скопировать
                    </>
                  )}
                </Button>

                <Accordion type="single" collapsible>
                  <AccordionItem value="raw">
                    <AccordionTrigger>Исходные данные (JSON)</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-3 rounded-md max-h-[60vh] overflow-auto break-words whitespace-pre-wrap">
                        {JSON.stringify(
                          finding?.type === "single"
                            ? finding.data
                            : finding?.raw,
                          null,
                          2,
                        )}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openJiraLink} onOpenChange={setOpenJiraLink}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Связать с Jira</DialogTitle>
            <DialogDescription>Укажите ключ задачи</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Label>Key</Label>
            <Input defaultValue="RETAIL-0" />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
