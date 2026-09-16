"use client";

import { AiChatDialog } from "@/components/vulnerabilities/AiChatDialog";
import { DescriptionDialog } from "@/components/vulnerabilities/DescriptionDialog";
import { JiraLinkDialog } from "@/components/vulnerabilities/JiraLinkDialog";
import { SeverityDialog } from "@/components/vulnerabilities/SeverityDialog";
import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import {
  DefectDojoProductType,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";
import { Vulnerability, VulnerabilitiesService } from "@/services/vulnerabilities.service";
import { VulnerabilitySyncService } from "@/services/vulnerability-sync.service";
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

  const [openAiChat, setOpenAiChat] = useState(false);
  const [aiFindingIds, setAiFindingIds] = useState<number[]>([]);

  const [openDescription, setOpenDescription] = useState(false);
  const [descriptionFindingIds, setDescriptionFindingIds] = useState<number[]>(
    [],
  );
  const [isBulkDescription, setIsBulkDescription] = useState(false);

  const [openJiraLink, setOpenJiraLink] = useState(false);
  const [isBulkJiraLink, setIsBulkJiraLink] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  const [openSeverityChange, setOpenSeverityChange] = useState(false);
  const [isBulkSeverityChange, setIsBulkSeverityChange] = useState(false);
  const [severitySaving, setSeveritySaving] = useState(false);

  useEffect(() => {
    DefectDojoReferenceService.getProductTypes()
      .then(setProductTypes)
      .catch(() =>
        setError("Не удалось получить типы продуктов из DefectDojo"),
      );
  }, []);

  const loadVulnerabilities = (product: DefectDojoProductType) => {
    setSelectedProductTypeId(product.id);
    setLoadingVulns(true);

    // Загружаем все уязвимости продукта разом: клиентские фильтры и пагинация
    // работают по этому списку.
    VulnerabilitiesService.getVulnerabilities(product.id, 1, 10000)
      .then((resp) => {
        setVulns(resp.data.map((v) => ({ ...v, productId: product.id })));
      })
      .catch(() => {
        setError("Не удалось получить уязвимости");
      })
      .finally(() => setLoadingVulns(false));
  };

  // --- Спросить у AI ---

  const handleAskAi = (vuln: Vulnerability) => {
    setAiFindingIds([vuln.id]);
    setOpenAiChat(true);
  };

  const handleBulkAskAi = () => {
    setAiFindingIds(selectedVulns.map((vuln) => vuln.id));
    setOpenAiChat(true);
  };

  // --- Описание для Jira ---

  const handleGenerateDescription = (vuln: Vulnerability) => {
    setIsBulkDescription(false);
    setDescriptionFindingIds([vuln.id]);
    setOpenDescription(true);
  };

  const handleBulkGenerateDescription = () => {
    setIsBulkDescription(true);
    setDescriptionFindingIds(selectedVulns.map((v) => v.id));
    setOpenDescription(true);
  };

  // --- Отправка в Jira (создание новой задачи) ---

  const handleSendToJira = useCallback(
    async (vuln: Vulnerability) => {
      if (!selectedProductTypeId) return;

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
    },
    [selectedProductTypeId],
  );

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

  // --- Связь с Jira (привязка к существующей задаче) ---

  const handleLinkWithJira = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setIsBulkJiraLink(false);
    setOpenJiraLink(true);
  };

  const handleBulkLinkWithJira = () => {
    setActiveVuln(null);
    setIsBulkJiraLink(true);
    setOpenJiraLink(true);
  };

  const handleSaveJiraLink = async (jiraKey: string) => {
    if (isBulkJiraLink) {
      if (selectedVulns.length === 0 || !jiraKey) return;

      setLinkSaving(true);
      try {
        const response = await VulnerabilitySyncService.executeCommand({
          action: "link",
          findingIds: selectedVulns.map((vuln) => vuln.id),
          jiraIssueKey: jiraKey,
        });
        const successfulIds = new Set(
          response.results
            .filter((result) => result.status === "success")
            .map((result) => result.findingId),
        );

        setVulns((prev) =>
          prev.map((v) =>
            successfulIds.has(v.id)
              ? { ...v, status: "Назначена", jiraIssueKey: jiraKey }
              : v,
          ),
        );
        toast.success(
          `Связано с Jira: ${response.succeeded} из ${response.total}`,
        );
        setOpenJiraLink(false);
      } finally {
        setLinkSaving(false);
      }
      return;
    }

    if (!activeVuln) return;

    setLinkSaving(true);
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
      setLinkSaving(false);
    }
  };

  // --- Синхронизация статуса с Jira ---

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
        throw new Error(
          response.results[0]?.error || "Не удалось отвязать от Jira",
        );
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
    toast.success(
      `Отвязано от Jira: ${response.succeeded} из ${response.total}`,
    );
  };

  // --- Критичность ---

  const handleChangeSeverity = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setIsBulkSeverityChange(false);
    setOpenSeverityChange(true);
  };

  const handleBulkChangeSeverity = () => {
    setActiveVuln(null);
    setIsBulkSeverityChange(true);
    setOpenSeverityChange(true);
  };

  const handleSaveSeverity = async (severity: string) => {
    if (isBulkSeverityChange) {
      if (selectedVulns.length === 0 || !severity) return;

      setSeveritySaving(true);
      try {
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
        toast.success(
          `Критичность изменена: ${response.succeeded} из ${response.total}`,
        );
        setOpenSeverityChange(false);
      } finally {
        setSeveritySaving(false);
      }
      return;
    }

    if (!activeVuln || !severity) return;

    setSeveritySaving(true);
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
      setSeveritySaving(false);
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

      <AiChatDialog
        open={openAiChat}
        onOpenChange={(open) => {
          setOpenAiChat(open);
          if (!open) {
            setAiFindingIds([]);
            setActiveVuln(null);
          }
        }}
        findingIds={aiFindingIds}
      />

      <DescriptionDialog
        open={openDescription}
        onOpenChange={(open) => {
          setOpenDescription(open);
          if (!open) {
            setDescriptionFindingIds([]);
            setIsBulkDescription(false);
          }
        }}
        findingIds={descriptionFindingIds}
        isBulk={isBulkDescription}
      />

      <JiraLinkDialog
        open={openJiraLink}
        onOpenChange={(open) => {
          setOpenJiraLink(open);
          if (!open) {
            setActiveVuln(null);
            setIsBulkJiraLink(false);
          }
        }}
        isBulk={isBulkJiraLink}
        selectedCount={selectedVulns.length}
        saving={linkSaving}
        canSave={Boolean(activeVuln) || isBulkJiraLink}
        onSave={handleSaveJiraLink}
      />

      <SeverityDialog
        key={`${openSeverityChange}-${activeVuln?.id ?? "bulk"}`}
        open={openSeverityChange}
        onOpenChange={(open) => {
          setOpenSeverityChange(open);
          if (!open) {
            setActiveVuln(null);
            setIsBulkSeverityChange(false);
          }
        }}
        isBulk={isBulkSeverityChange}
        selectedCount={selectedVulns.length}
        currentSeverity={activeVuln?.severity ?? ""}
        saving={severitySaving}
        canSave={Boolean(activeVuln) || isBulkSeverityChange}
        onSave={handleSaveSeverity}
      />
    </>
  );
}
