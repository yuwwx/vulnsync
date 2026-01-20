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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VulnerabilitiesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setselectedProductId] = useState<string | null>(
    null,
  );

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);
  const [loadingFinding, setLoadingFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [finding, setFinding] = useState<any>(null);
  const [openDescription, setOpenDescription] = useState(false);
  const [openJiraLink, setOpenJiraLink] = useState(false);

  const handleGenerateDescription = useCallback(async (vuln) => {
    setLoadingFinding(true);
    setFinding(null);

    try {
      const result = await IntegrationsService.getDefectDojoFinding(
        Number(vuln.id),
      );

      setFinding(result);
      setOpenDescription(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load DefectDojo finding",
      );
    } finally {
      setLoadingFinding(false);
    }
  }, []);

  const handleSendToJira = useCallback(async (vuln) => {
    try {
      await IntegrationsService.createJiraIssue({
        findingId: vuln.id,
        productId: vuln.productId,
      });
      setVulns((prev) =>
        prev.map((v) => (v.id === vuln.id ? { ...v, status: "SENT" } : v)),
      );
      toast.success("Jira issue created");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to create Jira issue",
      );
    }
  }, []);

  const handleLinkWithJira = useCallback(async (vuln) => {
    setOpenJiraLink(true);
  }, []);

  function formatVulnerabilityLinks(vulnIds: any[] = []) {
    return vulnIds
      .map((v) => {
        const id = v.vulnerability_id;

        if (id.startsWith("CVE-")) {
          return `https://nvd.nist.gov/vuln/detail/${id}`;
        }

        if (id.startsWith("GHSA-")) {
          return `https://github.com/advisories/${id}`;
        }

        return id;
      })
      .join(" ");
  }

  function buildJiraDescription(finding: any) {
    const vulnIds = (finding.vulnerability_ids ?? [])
      .map((v: any) => v.vulnerability_id)
      .join(", ");

    const vulnerabilityLinks = formatVulnerabilityLinks(
      finding.vulnerability_ids,
    );

    const severity = [
      finding.severity,
      finding.cvssv3_score && `CVSS ${finding.cvssv3_score}/10`,
      finding.cvssv3,
    ]
      .filter(Boolean)
      .join(", ");

    return `
**Название**
${`[sca] ${finding.title ?? "—"}`}

**Затронутые проекты**
${finding.related_fields.test.engagement.product.name ?? "—"}

**Уязвимые компоненты**
${finding.file_path ?? "—"}

**Идентификаторы уязвимости**
${vulnIds || "—"}

**Критичность**
${severity || "—"}

**Описание**
${finding.description || "—"}

**Ссылки**
${vulnerabilityLinks || "—"}
`.trim();
  }

  const columns = useMemo(
    () =>
      vulnerabilityColumns(
        handleSendToJira,
        handleLinkWithJira,
        handleGenerateDescription,
      ),
    [handleGenerateDescription],
  );

  // Загружаем только список продуктов
  useEffect(() => {
    IntegrationsService.getDefectDojoProductTypes()
      .then(setProducts)
      .catch((err) => {
        setError(`Failed to load products: ${err}`);
      })
      .catch(console.error);
  }, []);

  const loadVulnerabilities = (product) => {
    const productId = product?.id;

    setselectedProductId(productId);

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

  const jiraText = finding ? buildJiraDescription(finding) : "";

  return (
    <>
      <div className="flex gap-6">
        {/* Сайдбар с продуктами */}
        <ul className="w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {products.map((p) => (
            <li
              key={p?.id}
              className={`p-2 rounded cursor-pointer text-sm font-medium ${
                selectedProductId === p?.id
                  ? "bg-neutral-600 text-white"
                  : "hover:bg-muted"
              }`}
              onClick={() => loadVulnerabilities(p)}
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
          ) : !selectedProductId ? (
            <div className="text-neutral-500">
              Выберите продукт для работы с уязвимостями
            </div>
          ) : vulns.length === 0 && selectedProductId ? (
            <div>Не найдены уязвимости для выбранного продукта</div>
          ) : (
            <VulnerabilitiesTable columns={columns} data={vulns} />
          )}
        </div>
      </div>
      <Dialog open={openDescription} onOpenChange={setOpenDescription}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Описание уязвимости</DialogTitle>
          </DialogHeader>
          {loadingFinding || !finding ? (
            <div className="text-sm text-muted-foreground">Загрузка…</div>
          ) : (
            <>
              <div className="space-y-6 text-sm">
                <pre className="whitespace-pre-wrap break-all overflow-x-hidden w-full font-sans">
                  {jiraText}
                </pre>
                <Accordion type="single" collapsible>
                  <AccordionItem value="raw">
                    <AccordionTrigger>Raw finding (JSON)</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 text-sm flex justify-center">
                        <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md max-h-[70vh] overflow-x-auto sm:max-w-2xl">
                          {JSON.stringify(finding, null, 2)}
                        </pre>
                      </div>
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
            <DialogDescription>
              Связать уязвимость с сущностью в Jira
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Key</Label>
              <Input id="name-1" name="name" defaultValue="RETAIL-0" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
