"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { Vulnerability } from "@/services/vulnerabilities.service";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const severityOrder = ["Critical", "High", "Medium", "Low", "Info"];

const severitySortFn = (rowA: any, rowB: any, columnId: string) => {
  const a = rowA.getValue(columnId) ?? "Info";
  const b = rowB.getValue(columnId) ?? "Info";

  const indexA = severityOrder.indexOf(a);
  const indexB = severityOrder.indexOf(b);

  return indexA - indexB;
};

export const vulnerabilityColumns = (
  onSendToJira: (vuln: Vulnerability) => void,
  onLinkWithJira: (vuln: Vulnerability) => void,
  onSyncWithJira: (vuln: Vulnerability) => void,
  onUnsyncWithJira: (vuln: Vulnerability) => void,
  onGenerateDescription: (vuln: Vulnerability) => void,
): ColumnDef<Vulnerability>[] => [
  {
    id: "select",
    meta: { label: "Выбрать" },
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    meta: { label: "ID" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("id")}</span>,
  },
  {
    accessorKey: "title",
    meta: { label: "Название" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Название
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const vuln = row.original;

      return (
        <span
          className="cursor-pointer hover:underline"
          onClick={() => onGenerateDescription(vuln)}
        >
          {row.getValue("title")}
        </span>
      );
    },
  },
  {
    accessorKey: "severity",
    meta: { label: "Критичность" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Критичность
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
    sortingFn: severitySortFn,
  },
  {
    accessorKey: "product",
    meta: { label: "Продукт" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Продукт
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("product")}</span>,
  },
  {
    accessorKey: "cvssv3_score",
    meta: { label: "CVSSv3 Score" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          CVSSv3 Score
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("cvssv3_score")}</span>,
  },
  {
    accessorKey: "cvssv4_score",
    meta: { label: "CVSSv4 Score" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          CVSSv4 Score
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("cvssv4_score")}</span>,
  },
  {
    accessorKey: "creation_date",
    meta: { label: "Дата создания" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Дата создания
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("creation_date")}</span>,
  },
  {
    accessorKey: "status",
    meta: { label: "Статус" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Статус
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "jiraIssueKey",
    meta: { label: "Идентификатор в Jira" },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Идентификатор в Jira
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("jiraIssueKey")}</span>,
  },
  {
    id: "actions",
    meta: { label: "Действия" },
    header: "Действия",
    enableSorting: false,
    cell: ({ row }) => {
      const vuln = row.original;
      const { isAdmin } = useAuth();

      return (
        <>
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
                    onClick={() => onSendToJira(vuln)}
                  >
                    Отправить в Jira
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLinkWithJira(vuln)}>
                    Связать с Jira
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSyncWithJira(vuln)}>
                    Синхронизировать с Jira
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUnsyncWithJira(vuln)}>
                    Отвязать от Jira
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => onGenerateDescription(vuln)}>
                Сгенерировать описание
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];

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
