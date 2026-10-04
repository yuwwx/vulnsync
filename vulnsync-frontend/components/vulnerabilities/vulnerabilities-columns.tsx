"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { Vulnerability } from "@/services/vulnerabilities.service";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { vulnerabilityTableFeatures } from "./vulnerabilities-table-config";

// Кнопка сортировки в шапке колонки: direction null = не сортирована
function SortButton({
  label,
  direction,
  onToggle,
}: {
  label: string;
  direction: "asc" | "desc" | null;
  onToggle: () => void;
}) {
  return (
    <Button variant="ghost" onClick={onToggle}>
      {label}
      {direction === "asc" ? (
        <ArrowUp />
      ) : direction === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  );
}

// Действия над уязвимостью из меню строки
type VulnActions = {
  onSendToJira: (vuln: Vulnerability) => void;
  onLinkWithJira: (vuln: Vulnerability) => void;
  onSyncWithJira: (vuln: Vulnerability) => void;
  onUnsyncWithJira: (vuln: Vulnerability) => void;
  onChangeSeverity: (vuln: Vulnerability) => void;
  onGenerateDescription: (vuln: Vulnerability) => void;
  onAskAi: (vuln: Vulnerability) => void;
};

function RowActions({ vuln, actions }: { vuln: Vulnerability; actions: VulnActions }) {
  const { isAdmin } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Открыть меню</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[230px]">
        {isAdmin && (
          <>
            <DropdownMenuItem
              disabled={vuln.status !== "Не отправлена"}
              onClick={() => actions.onSendToJira(vuln)}
            >
              Отправить в Jira
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onLinkWithJira(vuln)}>
              Связать с Jira
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onSyncWithJira(vuln)}>
              Синхронизировать с Jira
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onUnsyncWithJira(vuln)}>
              Отвязать от Jira
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onChangeSeverity(vuln)}>
              Изменить критичность
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => actions.onGenerateDescription(vuln)}>
          Сгенерировать описание
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onAskAi(vuln)}>
          Спросить у AI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const vulnerabilityColumns = ({
  actions,
  onSelectToggle,
  selectedIds,
  sort,
  onSortToggle,
}: {
  actions: VulnActions;
  // Toggle выделения строк (см. колонку "select")
  onSelectToggle?: (vulns: Vulnerability[]) => void;
  selectedIds?: Set<number>;
  // Серверная сортировка: "severity" | "-id" ... (null = дефолт DD API: по id)
  sort?: string | null;
  onSortToggle?: (columnId: string) => void;
}): ColumnDef<typeof vulnerabilityTableFeatures, Vulnerability>[] => {
  // Направление сортировки для колонки (null = не сортирована)
  const direction = (columnId: string): "asc" | "desc" | null => {
    if (!sort || sort.replace('-', '') !== columnId) return null;

    return sort.startsWith('-') ? "desc" : "asc";
  };

  // Заголовок сортируемой колонки (только колонки из SORT_FIELDS бэкенда)
  const sortHeader = (columnId: string, label: string) => (
    <SortButton
      label={label}
      direction={direction(columnId)}
      onToggle={() => onSortToggle?.(columnId)}
    />
  );

  return [
  {
    id: "select",
    meta: { label: "Выбрать" },
    // Выделение управляется родителем (selectedIds): переживает пагинацию
    // и поиск, состояние rowSelection таблицы не используется
    header: ({ table }) => {
      const pageRows = table.getRowModel().rows;
      const selectedCount = pageRows.filter((row) =>
        selectedIds?.has(row.original.id),
      ).length;

      return (
        <Checkbox
          checked={
            selectedCount === pageRows.length && pageRows.length > 0
              ? true
              : selectedCount > 0
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => {
            // Toggle только строк текущей страницы
            const changed = pageRows.filter(
              (row) => Boolean(selectedIds?.has(row.original.id)) !== !!value,
            );
            onSelectToggle?.(changed.map((row) => row.original));
          }}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={selectedIds?.has(row.original.id) ?? false}
          onCheckedChange={() => onSelectToggle?.([row.original])}
        aria-label="Select row"
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "id",
    meta: { label: "ID" },
    header: () => sortHeader("id", "ID"),
    cell: ({ row }) => <span>{row.getValue("id")}</span>,
  },
  {
    accessorKey: "title",
    meta: { label: "Название" },
    header: () => sortHeader("title", "Название"),
    cell: ({ row }) => {
      const vuln = row.original;

      return (
        <span
          className="cursor-pointer hover:underline"
          onClick={() => actions.onGenerateDescription(vuln)}
        >
          {row.getValue("title")}
        </span>
      );
    },
  },
  {
    accessorKey: "severity",
    meta: { label: "Критичность" },
    header: () => sortHeader("severity", "Критичность"),
    cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
  },
  {
    accessorKey: "product",
    meta: { label: "Продукт" },
    header: () => sortHeader("product", "Продукт"),
    cell: ({ row }) => <span>{row.getValue("product")}</span>,
  },
  {
    // Сортировка по CVSS через DD API недоступна (нет в разрешённых o)
    accessorKey: "cvssv3_score",
    meta: { label: "CVSSv3 Score" },
    header: () => <span>CVSSv3 Score</span>,
    cell: ({ row }) => <span>{row.getValue("cvssv3_score")}</span>,
  },
  {
    accessorKey: "cvssv4_score",
    meta: { label: "CVSSv4 Score" },
    header: () => <span>CVSSv4 Score</span>,
    cell: ({ row }) => <span>{row.getValue("cvssv4_score")}</span>,
  },
  {
    // Сортировка по дате через DD API недоступна (нет в разрешённых o)
    accessorKey: "creation_date",
    meta: { label: "Дата создания" },
    header: () => <span>Дата создания</span>,
    cell: ({ row }) => <span>{row.getValue("creation_date")}</span>,
  },
  {
    accessorKey: "status",
    meta: { label: "Статус" },
    header: () => <span>Статус</span>,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "jiraIssueKey",
    meta: { label: "Идентификатор в Jira" },
    header: () => <span>Идентификатор в Jira</span>,
    cell: ({ row }) => <span>{row.getValue("jiraIssueKey")}</span>,
  },
  {
    id: "actions",
    meta: { label: "Действия" },
    header: "Действия",
    cell: ({ row }) => <RowActions vuln={row.original} actions={actions} />,
  },
  ];
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Info: "bg-neutral-200 text-neutral-800",
    Low: "bg-green-200 text-green-800",
    Medium: "bg-yellow-200 text-yellow-800",
    High: "bg-orange-200 text-orange-800",
    Critical: "bg-red-200 text-red-800",
  };

  return <Badge className={colors[severity]}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Не отправлена": "bg-neutral-200 text-neutral-800",
    Закрыта: "bg-green-200 text-green-800",
  };

  return (
    <Badge className={colors[status] || "bg-blue-200 text-blue-800"}>
      {status}
    </Badge>
  );
}
