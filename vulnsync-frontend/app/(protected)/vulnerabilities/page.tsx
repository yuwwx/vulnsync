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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import {
  DefectDojoProductType,
  IntegrationsService,
} from "@/services/integrations.service";
import {
  VulnerabilitiesService,
  Vulnerability,
  AiMessage,
} from "@/services/vulnerabilities.service";
import { DefectDojoFinding } from "@/services/integrations.service";
import { VulnerabilitySyncService } from "@/services/vulnerability-sync.service";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low", "Info"];

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

  const [rawFinding, setRawFinding] = useState<DefectDojoFinding | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  const [openJiraLink, setOpenJiraLink] = useState(false);
  const [isBulkJiraLink, setIsBulkJiraLink] = useState(false);

  const [copied, setCopied] = useState(false);

  const [description, setDescription] = useState<string>("");
  const [loadingDescription, setLoadingDescription] = useState(false);

  const [isBulk, setIsBulk] = useState(false);

  const [jiraKey, setJiraKey] = useState<string>("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [openSeverityChange, setOpenSeverityChange] = useState(false);
  const [isBulkSeverityChange, setIsBulkSeverityChange] = useState(false);
  const [severity, setSeverity] = useState("");
  const [severityLoading, setSeverityLoading] = useState(false);
  const [openAiChat, setOpenAiChat] = useState(false);
  const [aiFindingIds, setAiFindingIds] = useState<number[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const askAi = async (findingIds: number[], messages: AiMessage[] = []) => {
    setAiLoading(true);
    try {
      const { message } = await VulnerabilitiesService.askAi(findingIds, messages);
      setAiMessages((current) => [...current, message]);
    } catch {
      toast.error("Не удалось получить ответ AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskAi = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setAiFindingIds([vuln.id]);
    setAiMessages([]);
    setAiPrompt("");
    setOpenAiChat(true);
    void askAi([vuln.id]);
  };

  const handleBulkAskAi = () => {
    const findingIds = selectedVulns.map((vuln) => vuln.id);
    setActiveVuln(null);
    setAiFindingIds(findingIds);
    setAiMessages([]);
    setAiPrompt("");
    setOpenAiChat(true);
    void askAi(findingIds);
  };

  const handleSendAiPrompt = async () => {
    const content = aiPrompt.trim();
    if (!content || aiLoading) return;
    const userMessage: AiMessage = { role: "user", content };
    setAiPrompt("");
    setAiMessages((current) => [...current, userMessage]);
    await askAi(aiFindingIds, [...aiMessages, userMessage]);
  };

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
    if (isBulkJiraLink) {
      await handleSaveBulkJiraLink();
      return;
    }

    if (!activeVuln) return;

    setLinkLoading(true);

    try {
      const command = await VulnerabilitySyncService.executeCommand({
        action: "link",
        findingIds: [activeVuln.id],
        jiraIssueKey: jiraKey,
      });
      const response = command.results[0];

      if (response?.status !== "success") {
        throw new Error(response?.error || "Не удалось связать с Jira");
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === activeVuln.id
            ? {
                ...v,
                status: response.syncedStatus ?? v.status,
                jiraIssueKey: response.jiraIssueKey ?? v.jiraIssueKey,
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
    setIsBulkJiraLink(false);
    setOpenJiraLink(true);
  };

  const handleSyncWithJira = async (vuln: Vulnerability) => {
    try {
      const command = await VulnerabilitySyncService.executeCommand({
        action: "sync",
        findingIds: [vuln.id],
      });
      const response = command.results[0];

      if (response?.status !== "success") {
        toast.error(response?.error || "Не удалось синхронизировать статус");
        return;
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === vuln.id
            ? {
                ...v,
                status: response.syncedStatus ?? v.status,
                jiraIssueKey: response.jiraIssueKey ?? v.jiraIssueKey,
              }
            : v,
        ),
      );

      toast.success("Статус синхронизирован");
    } catch {
      toast.error("Не удалось синхронизировать статус");
    }
  };

  const handleUnsyncWithJira = async (vuln: Vulnerability) => {
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "unsync",
        findingIds: [vuln.id],
      });

      if (response.results[0]?.status !== "success") {
        throw new Error(response.results[0]?.error || "Не удалось отвязать от Jira");
      }

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

  const handleChangeSeverity = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setIsBulkSeverityChange(false);
    setSeverity(vuln.severity);
    setOpenSeverityChange(true);
  };

  const handleSaveSeverity = async () => {
    if (isBulkSeverityChange) {
      await handleSaveBulkSeverity();
      return;
    }

    if (!activeVuln || !severity) return;

    setSeverityLoading(true);
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "severity",
        findingIds: [activeVuln.id],
        severity,
      });
      const result = response.results[0];

      if (result?.status !== "success") {
        throw new Error(result?.error || "Не удалось изменить критичность");
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === activeVuln.id
            ? { ...v, severity: result.severity ?? v.severity }
            : v,
        ),
      );
      toast.success("Критичность изменена, finding отмечен как Verified");
      setOpenSeverityChange(false);
    } catch {
      toast.error("Не удалось изменить критичность");
    } finally {
      setSeverityLoading(false);
    }
  };

  const handleBulkLinkWithJira = () => {
    setActiveVuln(null);
    setIsBulkJiraLink(true);
    setOpenJiraLink(true);
  };

  const handleSaveBulkJiraLink = async () => {
    if (selectedVulns.length === 0 || !jiraKey.trim()) return;

    setLinkLoading(true);
    const response = await VulnerabilitySyncService.executeCommand({
      action: "link",
      findingIds: selectedVulns.map((vuln) => vuln.id),
      jiraIssueKey: jiraKey.trim(),
    });
    const successfulIds = new Set(
      response.results
        .filter((result) => result.status === "success")
        .map((result) => result.findingId),
    );

    setVulns((prev) =>
      prev.map((v) =>
        successfulIds.has(v.id)
          ? { ...v, status: "Назначена", jiraIssueKey: jiraKey.trim() }
          : v,
      ),
    );
    toast.success(`Связано с Jira: ${response.succeeded} из ${response.total}`);
    setOpenJiraLink(false);
    setJiraKey("");
    setLinkLoading(false);
  };

  const handleBulkSyncWithJira = async () => {
    const response = await VulnerabilitySyncService.executeCommand({
      action: "sync",
      findingIds: selectedVulns.map((vuln) => vuln.id),
    });
    const resultsById = new Map(
      response.results.map((result) => [result.findingId, result]),
    );
    setVulns((prev) =>
      prev.map((v) => {
        const result = resultsById.get(v.id);
        return result?.status === "success"
          ? {
              ...v,
              status: result.syncedStatus ?? v.status,
              jiraIssueKey: result.jiraIssueKey ?? v.jiraIssueKey,
            }
          : v;
      }),
    );
    toast.success(
      `Статус синхронизирован: ${response.succeeded} из ${response.total}`,
    );
  };

  const handleBulkUnsyncWithJira = async () => {
    const response = await VulnerabilitySyncService.executeCommand({
      action: "unsync",
      findingIds: selectedVulns.map((vuln) => vuln.id),
    });
    const successfulIds = new Set(
      response.results
        .filter((result) => result.status === "success")
        .map((result) => result.findingId),
    );
    setVulns((prev) =>
      prev.map((v) =>
        successfulIds.has(v.id)
          ? { ...v, status: "Не отправлена", jiraIssueKey: "" }
          : v,
      ),
    );
    toast.success(`Отвязано от Jira: ${response.succeeded} из ${response.total}`);
  };

  const handleBulkChangeSeverity = () => {
    setActiveVuln(null);
    setIsBulkSeverityChange(true);
    setSeverity("");
    setOpenSeverityChange(true);
  };

  const handleSaveBulkSeverity = async () => {
    if (selectedVulns.length === 0 || !severity) return;

    setSeverityLoading(true);
    const response = await VulnerabilitySyncService.executeCommand({
      action: "severity",
      findingIds: selectedVulns.map((vuln) => vuln.id),
      severity,
    });
    const successfulIds = new Set(
      response.results
        .filter((result) => result.status === "success")
        .map((result) => result.findingId),
    );
    setVulns((prev) =>
      prev.map((v) =>
        successfulIds.has(v.id) ? { ...v, severity } : v,
      ),
    );
    toast.success(`Критичность изменена: ${response.succeeded} из ${response.total}`);
    setOpenSeverityChange(false);
    setSeverity("");
    setSeverityLoading(false);
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
        handleChangeSeverity,
        handleGenerateDescription,
        handleAskAi,
      ),
    [
      handleSendToJira,
      handleLinkWithJira,
      handleSyncWithJira,
      handleUnsyncWithJira,
      handleChangeSeverity,
      handleGenerateDescription,
      handleAskAi,
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

    VulnerabilitiesService.getVulnerabilities(product.id, 1, 10000)
      .then((resp) => {
        setVulns(resp.data.map((v) => ({ ...v, productId: product.id })));
      })
      .catch(() => {
        setError("Не удалось получить уязвимости");
      })
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
                bulkActions={[
                  {
                    label: `Сгенерировать описание (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkGenerateDescription,
                  },
                  {
                    label: `Спросить у AI (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkAskAi,
                  },
                  {
                    label: `Объединить и отправить в Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkSendToJira,
                  },
                  {
                    label: `Связать с Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkLinkWithJira,
                  },
                  {
                    label: `Синхронизировать с Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkSyncWithJira,
                  },
                  {
                    label: `Отвязать от Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkUnsyncWithJira,
                  },
                  {
                    label: `Изменить критичность (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkChangeSeverity,
                  },
                ]}
              />
          )}
        </div>
      </div>

      <Dialog
        open={openAiChat}
        onOpenChange={(open) => {
          setOpenAiChat(open);
          if (!open) {
            setAiMessages([]);
            setAiPrompt("");
            setAiFindingIds([]);
            setActiveVuln(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Спросить у AI</DialogTitle>
            <DialogDescription>
              Анализ уязвимости и продолжение диалога с Application Security Engineer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 max-h-[55vh] space-y-4 overflow-y-auto rounded-md border p-4">
            {aiMessages.length === 0 && !aiLoading && (
              <div className="text-sm text-muted-foreground">Подготавливаем анализ...</div>
            )}
            {aiMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "ml-8 rounded-md bg-muted p-3" : "mr-8 rounded-md bg-blue-50 p-3"}
              >
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {message.role === "user" ? "Вы" : "AI"}
                </div>
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            ))}
            {aiLoading && <div className="text-sm text-muted-foreground">AI печатает...</div>}
          </div>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendAiPrompt();
                }
              }}
              placeholder="Задайте уточняющий вопрос..."
              disabled={aiLoading}
            />
            <Button onClick={() => void handleSendAiPrompt()} disabled={!aiPrompt.trim() || aiLoading}>
              Отправить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            setIsBulkJiraLink(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Связать с Jira</DialogTitle>
            <DialogDescription>
              {isBulkJiraLink
                ? `Укажите ключ задачи для ${selectedVulns.length} уязвимостей`
                : "Укажите ключ задачи"}
            </DialogDescription>
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
              disabled={(!activeVuln && !isBulkJiraLink) || linkLoading}
            >
              {linkLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openSeverityChange}
        onOpenChange={(open) => {
          setOpenSeverityChange(open);
          if (!open) {
            setActiveVuln(null);
            setSeverity("");
            setIsBulkSeverityChange(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Изменить критичность</DialogTitle>
            <DialogDescription>
              {isBulkSeverityChange
                ? `Новая критичность будет применена к ${selectedVulns.length} уязвимостям.`
                : "Новая критичность будет сохранена в DefectDojo, а finding отмечен как Verified."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Label htmlFor="severity">Критичность</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity">
                <SelectValue placeholder="Выберите критичность" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button
              onClick={handleSaveSeverity}
              disabled={
                (!activeVuln && !isBulkSeverityChange) ||
                !severity ||
                severityLoading
              }
            >
              {severityLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
