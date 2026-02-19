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
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import {
  DefectDojoProductType,
  IntegrationsService,
} from "@/services/integrations.service";
import {
  VulnerabilitiesService,
  Vulnerability,
} from "@/services/vulnerabilities.service";
import { VulnerabilitySyncService } from "@/services/vulnerability-sync.service";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function VulnerabilitiesPage() {
  const [productTypes, setProductTypes] = useState<DefectDojoProductType[]>([]);
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<
    number | null
  >(null);

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [selectedVulns, setSelectedVulns] = useState<Vulnerability[]>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [activeVuln, setActiveVuln] = useState<Vulnerability | null>(null);
  const [openDescription, setOpenDescription] = useState(false);

  const [rawFinding, setRawFinding] = useState<any | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  const [openJiraLink, setOpenJiraLink] = useState(false);

  const [copied, setCopied] = useState(false);

  const [description, setDescription] = useState<string>("");
  const [loadingDescription, setLoadingDescription] = useState(false);

  const [isBulk, setIsBulk] = useState(false);

  const [jiraKey, setJiraKey] = useState<string>("");
  const [linkLoading, setLinkLoading] = useState(false);

  const handleGenerateDescription = async (vuln: Vulnerability) => {
    setIsBulk(false);
    setActiveVuln(vuln);

    setRawFinding(null);
    setDescription("");
    setLoadingDescription(true);

    setOpenDescription(true);

    try {
      const { description } =
        await VulnerabilitiesService.previewJiraDescription([vuln.id]);
      setDescription(description);
    } catch {
      toast.error("Не удалось сгенерировать описание");
    } finally {
      setLoadingDescription(false);
    }
  };

  const handleBulkGenerateDescription = async () => {
    setIsBulk(true);
    setActiveVuln(null);

    setRawFinding(null);
    setDescription("");
    setLoadingDescription(true);

    setOpenDescription(true);

    try {
      const { description } =
        await VulnerabilitiesService.previewJiraDescription(
          selectedVulns.map((v) => v.id),
        );

      setDescription(description);
    } catch {
      toast.error("Не удалось сгенерировать описание");
    } finally {
      setLoadingDescription(false);
    }
  };

  const handleBulkSendToJira = useCallback(async () => {
    if (!selectedProductTypeId || selectedVulns.length === 0) return;

    try {
      // Создаём один Jira issue на все выбранные уязвимости
      const response = await VulnerabilitySyncService.createBulkJiraIssue({
        findingIds: selectedVulns.map((v) => v.id),
        ddProductTypeId: selectedProductTypeId,
      });

      const jiraIssueKey = response?.jiraIssueKey;

      if (!jiraIssueKey) {
        toast.error("Jira issue не создан");
        return;
      }

      const vulnIds = new Set(selectedVulns.map((v) => v.id));

      // Обновляем все выбранные уязвимости
      setVulns((prev) =>
        prev.map((v) =>
          vulnIds.has(v.id) ? { ...v, status: "Назначена", jiraIssueKey } : v,
        ),
      );

      toast.success("Jira issue создан");
    } catch (error) {
      toast.error("Не удалось создать Jira issue");
    }
  }, [selectedProductTypeId, selectedVulns]);

  const handleSendToJira = useCallback(
    async (vuln: Vulnerability) => {
      if (selectedProductTypeId) {
        try {
          const response = await VulnerabilitySyncService.createJiraIssue({
            findingId: vuln.id,
            ddProductTypeId: selectedProductTypeId,
          });

          setVulns((prev) =>
            prev.map((v) =>
              v.id === vuln.id
                ? {
                    ...v,
                    status: "Назначена",
                    jiraIssueKey: response?.jiraIssueKey,
                  }
                : v,
            ),
          );

          toast.success("Jira issue создан");
        } catch (error) {
          toast.error(`Не удалось создать Jira issue`);
        }
      }
    },
    [selectedProductTypeId],
  );

  const handleSaveJiraLink = async () => {
    if (!activeVuln) return;

    setLinkLoading(true);

    try {
      const response = await VulnerabilitySyncService.linkWithJira({
        findingId: activeVuln.id,
        jiraIssueKey: jiraKey,
      });

      setVulns((prev) =>
        prev.map((v) =>
          v.id === activeVuln.id
            ? {
                ...v,
                status: response.status,
                jiraIssueKey: response.jiraIssueKey,
              }
            : v,
        ),
      );

      toast.success("Связано с Jira");
      setOpenJiraLink(false);
    } catch {
      toast.error("Не удалось связать с Jira");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkWithJira = async (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setOpenJiraLink(true);
  };

  const handleSyncWithJira = async (vuln: Vulnerability) => {
    try {
      const response = await VulnerabilitySyncService.syncJiraStatus(vuln.id);

      setVulns((prev) =>
        prev.map((v) =>
          v.id === vuln.id ? { ...v, status: response.status } : v,
        ),
      );

      toast.success("Статус синхронизирован");
    } catch {
      toast.error("Не удалось синхронизировать статус");
    }
  };

  const handleUnsyncWithJira = async (vuln: Vulnerability) => {
    try {
      await VulnerabilitySyncService.unsyncJiraStatus(vuln.id);

      setVulns((prev) =>
        prev.map((v) =>
          v.id === vuln.id
            ? { ...v, status: "Не отправлена", jiraIssueKey: "" }
            : v,
        ),
      );

      toast.success("Успешно отвязана");
    } catch {
      toast.error("Не удалось отвязать от Jira");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadRawFinding = async () => {
    if (!activeVuln || rawFinding || rawLoading) return;

    setRawLoading(true);
    try {
      const raw = await IntegrationsService.getDefectDojoFinding(activeVuln.id);
      setRawFinding(raw);
    } catch {
      toast.error("Не удалось загрузить исходные данные");
    } finally {
      setRawLoading(false);
    }
  };

  const columns = useMemo(
    () =>
      vulnerabilityColumns(
        handleSendToJira,
        handleLinkWithJira,
        handleSyncWithJira,
        handleUnsyncWithJira,
        handleGenerateDescription,
      ),
    [
      handleSendToJira,
      handleLinkWithJira,
      handleSyncWithJira,
      handleUnsyncWithJira,
      handleGenerateDescription,
    ],
  );

  useEffect(() => {
    IntegrationsService.getDefectDojoProductTypes()
      .then(setProductTypes)
      .catch(() =>
        setError("Не удалось получить типы продуктов из DefectDojo"),
      );
  }, []);

  const loadVulnerabilities = (product: DefectDojoProductType) => {
    setSelectedProductTypeId(product.id);
    setLoadingVulns(true);

    VulnerabilitiesService.getVulnerabilities(product.id)
      .then((data) =>
        setVulns(data.map((v) => ({ ...v, productId: product.id }))),
      )
      .catch(() => setError("Не удалось получить уязвимости"))
      .finally(() => setLoadingVulns(false));
  };

  return (
    <>
      <div className="flex gap-6">
        <ul className="min-w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {productTypes.map((p) => (
            <li
              key={p.id}
              onClick={() => loadVulnerabilities(p)}
              className={`p-2 rounded cursor-pointer text-sm font-medium ${
                selectedProductTypeId === p.id
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
          ) : !selectedProductTypeId ? (
            <div className="text-neutral-500">Выберите продукт</div>
          ) : (
            <VulnerabilitiesTable
              data={vulns}
              columns={columns}
              onSelectionChange={setSelectedVulns}
              bulkActionDescription={{
                label: `Сгенерировать описание (${selectedVulns.length})`,
                disabled: selectedVulns.length === 0,
                onClick: handleBulkGenerateDescription,
              }}
              bulkActionSendToJira={{
                label: `Отправить в Jira (${selectedVulns.length})`,
                disabled: selectedVulns.length === 0,
                onClick: handleBulkSendToJira,
              }}
            />
          )}
        </div>
      </div>

      <Dialog
        open={openDescription}
        onOpenChange={(open) => {
          setOpenDescription(open);
          if (!open) {
            setActiveVuln(null);
            setRawFinding(null);
            setIsBulk(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Описание уязвимости</DialogTitle>
          </DialogHeader>

          {(activeVuln || isBulk) && (
            <>
              <div className="space-y-4 text-sm">
                {loadingDescription ? (
                  <div>Загрузка...</div>
                ) : (
                  description
                    .split("\n")
                    .map((line, i) => <div key={i}>{line || "\u00A0"}</div>)
                )}
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
                {!isBulk && (
                  <Accordion
                    type="single"
                    collapsible
                    onValueChange={(value) => {
                      if (value === "raw") {
                        loadRawFinding();
                      }
                    }}
                  >
                    <AccordionItem value="raw">
                      <AccordionTrigger>
                        Исходные данные (JSON)
                      </AccordionTrigger>
                      <AccordionContent>
                        {rawLoading ? (
                          <div className="text-sm text-muted-foreground">
                            Загрузка…
                          </div>
                        ) : (
                          <pre className="bg-muted p-3 rounded-md h-[60vh] overflow-auto break-words whitespace-pre-wrap">
                            {rawFinding
                              ? JSON.stringify(rawFinding, null, 2)
                              : "—"}
                          </pre>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openJiraLink}
        onOpenChange={(open) => {
          setOpenJiraLink(open);
          if (!open) {
            setActiveVuln(null);
            setJiraKey("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Связать с Jira</DialogTitle>
            <DialogDescription>Укажите ключ задачи</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Label>Key</Label>
            <Input
              placeholder="PROJECT-..."
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button
              onClick={handleSaveJiraLink}
              disabled={!activeVuln || linkLoading}
            >
              {linkLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
