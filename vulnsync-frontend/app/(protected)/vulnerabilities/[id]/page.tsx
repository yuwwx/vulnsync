"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiChatDialog } from "@/components/vulnerabilities/AiChatDialog";
import { DescriptionDialog } from "@/components/vulnerabilities/DescriptionDialog";
import { JiraLinkDialog } from "@/components/vulnerabilities/JiraLinkDialog";
import { SeverityDialog } from "@/components/vulnerabilities/SeverityDialog";
import { useAuth } from "@/lib/useAuth";
import { VulnerabilitySyncService } from "@/services/vulnerability-sync.service";
import {
  VulnerabilitiesService,
  type ImportHistoryEntry,
  type VulnerabilityDetail,
} from "@/services/vulnerabilities.service";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  Info: "bg-neutral-200 text-neutral-800",
  Low: "bg-green-200 text-green-800",
  Medium: "bg-yellow-200 text-yellow-800",
  High: "bg-orange-200 text-orange-800",
  Critical: "bg-red-200 text-red-800",
};

const FLAG_STYLES: Record<string, string> = {
  Active: "bg-blue-200 text-blue-800",
  Verified: "bg-green-200 text-green-800",
  "False Positive": "bg-neutral-200 text-neutral-800",
  Duplicate: "bg-neutral-200 text-neutral-800",
  "Out of scope": "bg-neutral-200 text-neutral-800",
  "Risk accepted": "bg-yellow-200 text-yellow-800",
  Mitigated: "bg-neutral-200 text-neutral-800",
};

// Коды действий импорта DefectDojo (test_import_finding_action.action)
const IMPORT_ACTION_LABELS: Record<string, string> = {
  N: "Создана",
  C: "Закрыта",
  R: "Переоткрыта",
  U: "Без изменений",
};

type LoadState =
  | { id: number; detail: VulnerabilityDetail }
  | { id: number; error: string };

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  if (children === null || children === undefined || children === "") {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-words">{children}</div>
    </div>
  );
}

function Section({ title, text }: { title: string; text?: string }) {
  if (!text || !text.trim()) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap break-words">{text}</div>
      </CardContent>
    </Card>
  );
}

function vulnerabilityIdHref(id?: string | null): string | null {
  if (id?.startsWith("CVE-")) {
    return `https://nvd.nist.gov/vuln/detail/${id}`;
  }
  if (id?.startsWith("GHSA-")) {
    return `https://github.com/advisories/${id}`;
  }
  return null;
}

export default function VulnerabilityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const id = Number(params.id);
  const invalid = !Number.isFinite(id);

  const [state, setState] = useState<LoadState | null>(null);
  // История импортов грузится лениво — при первом раскрытии блока.
  const [openHistoryId, setOpenHistoryId] = useState<number | null>(null);
  const [historyState, setHistoryState] = useState<
    | { id: number; status: "loading" }
    | { id: number; status: "loaded"; items: ImportHistoryEntry[] }
    | { id: number; status: "error" }
    | null
  >(null);

  // Действия над уязвимостью — те же, что в меню строки таблицы.
  const [openAiChat, setOpenAiChat] = useState(false);
  const [openDescription, setOpenDescription] = useState(false);
  const [openJiraLink, setOpenJiraLink] = useState(false);
  const [openSeverity, setOpenSeverity] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      return;
    }

    let cancelled = false;

    VulnerabilitiesService.getVulnerability(id)
      .then((detail) => {
        if (!cancelled) {
          setState({ id, detail });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ id, error: "Не удалось загрузить уязвимость" });
          toast.error("Не удалось загрузить уязвимость");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = state && state.id === id ? state : null;
  const finding = current && "detail" in current ? current.detail.finding : null;
  const status =
    current && "detail" in current ? current.detail.status : "";
  const jiraIssueKey =
    current && "detail" in current ? current.detail.jiraIssueKey : null;
  const loading = !invalid && !current;
  const error = invalid
    ? "Некорректный идентификатор уязвимости"
    : current && "error" in current
      ? current.error
      : null;

  const engagement = finding?.related_fields?.test?.engagement;
  const test = finding?.related_fields?.test;
  const vulnIds = finding?.vulnerability_ids ?? [];

  const flags: { label: string; on?: boolean }[] = [
    { label: "Active", on: finding?.active },
    { label: "Verified", on: finding?.verified },
    { label: "False Positive", on: finding?.false_p },
    { label: "Duplicate", on: finding?.duplicate },
    { label: "Out of scope", on: finding?.out_of_scope },
    { label: "Risk accepted", on: finding?.risk_accepted },
    { label: "Mitigated", on: finding?.is_mitigated },
  ];

  const historyOpen = openHistoryId === id;
  const currentHistory = historyState?.id === id ? historyState : null;

  const toggleHistory = () => {
    if (historyOpen) {
      setOpenHistoryId(null);
      return;
    }

    setOpenHistoryId(id);

    if (currentHistory && currentHistory.status !== "error") {
      return;
    }

    setHistoryState({ id, status: "loading" });
    VulnerabilitiesService.getImportHistory(id)
      .then((items) => setHistoryState({ id, status: "loaded", items }))
      .catch(() => setHistoryState({ id, status: "error" }));
  };

  const reloadDetail = () => {
    VulnerabilitiesService.getVulnerability(id)
      .then((detail) => setState({ id, detail }))
      .catch(() => undefined);
  };

  const ddProductTypeId =
    finding?.related_fields?.test?.engagement?.product?.prod_type?.id;

  const handleSendToJira = async () => {
    if (!ddProductTypeId) {
      toast.error("Не удалось определить группу продукта");
      return;
    }

    setActionSaving(true);
    try {
      await VulnerabilitySyncService.createJiraIssue({
        findingId: id,
        ddProductTypeId,
      });
      toast.success("Jira issue создан");
      reloadDetail();
    } catch {
      toast.error("Не удалось создать Jira issue");
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveJiraLink = async (jiraKey: string) => {
    setActionSaving(true);
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "link",
        findingIds: [id],
        jiraIssueKey: jiraKey,
      });

      if (response.results[0]?.status !== "success") {
        throw new Error("Не удалось связать с Jira");
      }

      toast.success("Связано с Jira");
      setOpenJiraLink(false);
      reloadDetail();
    } catch {
      toast.error("Не удалось связать с Jira");
    } finally {
      setActionSaving(false);
    }
  };

  const handleSyncJira = async () => {
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "sync",
        findingIds: [id],
      });

      if (response.results[0]?.status !== "success") {
        throw new Error("Не удалось синхронизировать статус");
      }

      toast.success("Статус синхронизирован");
      reloadDetail();
    } catch {
      toast.error("Не удалось синхронизировать статус");
    }
  };

  const handleUnsyncJira = async () => {
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "unsync",
        findingIds: [id],
      });

      if (response.results[0]?.status !== "success") {
        throw new Error("Не удалось отвязать от Jira");
      }

      toast.success("Успешно отвязана");
      reloadDetail();
    } catch {
      toast.error("Не удалось отвязать от Jira");
    }
  };

  const handleSaveSeverity = async (severity: string) => {
    setActionSaving(true);
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "severity",
        findingIds: [id],
        severity,
      });

      if (response.results[0]?.status !== "success") {
        throw new Error("Не удалось изменить критичность");
      }

      toast.success("Критичность изменена, finding отмечен как Verified");
      setOpenSeverity(false);
      reloadDetail();
    } catch {
      toast.error("Не удалось изменить критичность");
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/vulnerabilities");
          }
        }}
      >
        <ArrowLeft /> К уязвимостям
      </Button>

      {loading ? (
        <div className="text-neutral-500">Загрузка…</div>
      ) : error ? (
        <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>
      ) : finding ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold">{finding.title}</h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={actionSaving}>
                  Действия <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[230px]">
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      disabled={status !== "Не отправлена"}
                      onClick={() => void handleSendToJira()}
                    >
                      Отправить в Jira
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenJiraLink(true)}>
                      Связать с Jira
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleSyncJira()}>
                      Синхронизировать с Jira
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleUnsyncJira()}>
                      Отвязать от Jira
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenSeverity(true)}>
                      Изменить критичность
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setOpenDescription(true)}>
                  Сгенерировать описание для Jira
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenAiChat(true)}>
                  Спросить у AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Основное</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2 xl:grid-cols-3">
              <Field label="ID">{finding.id}</Field>
              <Field label="Критичность">
                <Badge className={SEVERITY_COLORS[finding.severity]}>
                  {finding.severity}
                </Badge>
              </Field>
              <Field label="Статусы">
                <span className="flex flex-wrap gap-1">
                  {flags
                    .filter((flag) => flag.on)
                    .map((flag) => (
                      <span
                        key={flag.label}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag.label]}`}
                      >
                        {flag.label}
                      </span>
                    ))}
                </span>
              </Field>
              <Field label="Статус Jira">{status}</Field>
              <Field label="Идентификатор в Jira">{jiraIssueKey}</Field>
              <Field label="Продукт">{engagement?.product?.name}</Field>
              <Field label="Группа продуктов">
                {engagement?.product?.prod_type?.name}
              </Field>
              <Field label="Сканирование">{engagement?.name}</Field>
              <Field label="Тест">
                {test?.title ?? test?.test_type?.name}
              </Field>
              <Field label="Ветка / Тег">{engagement?.branch_tag}</Field>
              <Field label="Build ID">{engagement?.build_id}</Field>
              <Field label="Хэш коммита">{engagement?.commit_hash}</Field>
              <Field label="Компонент">
                {[finding.component_name, finding.component_version]
                  .filter(Boolean)
                  .join(" ")}
              </Field>
              <Field label="Файл">
                {finding.file_path
                  ? `${finding.file_path}${finding.line ? `:${finding.line}` : ""}`
                  : ""}
              </Field>
              <Field label="CWE">
                {finding.cwe ? `CWE-${finding.cwe}` : ""}
              </Field>
              <Field label="CVSSv3">
                {finding.cvssv3_score ?? finding.cvssv3}
              </Field>
              <Field label="CVSSv4">
                {finding.cvssv4_score ?? finding.cvssv4}
              </Field>
              <Field label="Vuln ID (tool)">{finding.vuln_id_from_tool}</Field>
              <Field label="Unique ID (tool)">
                {finding.unique_id_from_tool}
              </Field>
              <Field label="Дата">{finding.date}</Field>
              <Field label="Создано">{finding.created}</Field>
              <Field label="Обновлено">{finding.updated}</Field>
              <Field label="Закрыто">{finding.mitigated}</Field>
              <Field label="Теги">{finding.tags?.join(", ")}</Field>
              <Field label="Идентификаторы уязвимости">
                {vulnIds.length ? (
                  <span className="flex flex-col gap-0.5">
                    {vulnIds.map((item, index) => {
                      const vid = item.vulnerability_id;
                      const href = vulnerabilityIdHref(vid);

                      return href ? (
                        <a
                          key={index}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {vid}
                        </a>
                      ) : (
                        <span key={index}>{vid}</span>
                      );
                    })}
                  </span>
                ) : null}
              </Field>
            </CardContent>
          </Card>

          <Section title="Описание" text={finding.description} />
          <Section title="Влияние" text={finding.impact} />
          <Section title="Рекомендации" text={finding.mitigation} />
          <Section
            title="Шаги воспроизведения"
            text={finding.steps_to_reproduce}
          />
          <Section
            title="Обоснование критичности"
            text={finding.severity_justification}
          />
          <Section title="Ссылки" text={finding.references} />

          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={toggleHistory}
                className="flex w-full items-center justify-between text-left"
              >
                <CardTitle>История импортов</CardTitle>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    historyOpen && "rotate-180",
                  )}
                />
              </button>
            </CardHeader>
            {historyOpen && (
              <CardContent className="text-sm">
                {currentHistory?.status === "loading" && (
                  <div className="text-muted-foreground">Загрузка…</div>
                )}
                {currentHistory?.status === "error" && (
                  <div className="text-red-700">
                    Не удалось загрузить историю импортов
                  </div>
                )}
                {currentHistory?.status === "loaded" &&
                  (currentHistory.items.length === 0 ? (
                    <div className="text-muted-foreground">
                      Импортов для этой уязвимости не найдено
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {currentHistory.items.map((item) => (
                        <li
                          key={item.id}
                          className="border-b pb-3 last:border-b-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              Импорт #{item.id}
                            </span>
                            {item.created && (
                              <span className="text-xs text-muted-foreground">
                                {item.created}
                              </span>
                            )}
                            {item.actions.map((action, index) => (
                              <span
                                key={index}
                                className="rounded bg-muted px-2 py-0.5 text-xs"
                              >
                                {IMPORT_ACTION_LABELS[action.action ?? ""] ??
                                  action.action ??
                                  "—"}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {item.buildId && <span>Build: {item.buildId}</span>}
                            {item.version && <span>Версия: {item.version}</span>}
                            {item.branchTag && (
                              <span>Ветка/тег: {item.branchTag}</span>
                            )}
                            {item.commitHash && (
                              <span>Коммит: {item.commitHash}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ))}
              </CardContent>
            )}
          </Card>

          <AiChatDialog
            open={openAiChat}
            onOpenChange={setOpenAiChat}
            findingIds={[id]}
          />

          <DescriptionDialog
            open={openDescription}
            onOpenChange={setOpenDescription}
            findingIds={[id]}
            isBulk={false}
          />

          <JiraLinkDialog
            open={openJiraLink}
            onOpenChange={setOpenJiraLink}
            isBulk={false}
            selectedCount={1}
            saving={actionSaving}
            canSave
            onSave={handleSaveJiraLink}
          />

          <SeverityDialog
            key={`${openSeverity}-${id}`}
            open={openSeverity}
            onOpenChange={setOpenSeverity}
            isBulk={false}
            selectedCount={1}
            currentSeverity={finding.severity}
            saving={actionSaving}
            canSave
            onSave={handleSaveSeverity}
          />
        </div>
      ) : null}
    </div>
  );
}
