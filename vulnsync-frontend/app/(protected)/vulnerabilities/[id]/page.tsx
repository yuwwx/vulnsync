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
  VulnerabilitiesService,
  type VulnerabilityDetail,
} from "@/services/vulnerabilities.service";
import { ArrowLeft } from "lucide-react";
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
  const id = Number(params.id);
  const invalid = !Number.isFinite(id);

  const [state, setState] = useState<LoadState | null>(null);

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
          <h1 className="text-xl font-semibold">{finding.title}</h1>

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
        </div>
      ) : null}
    </div>
  );
}
