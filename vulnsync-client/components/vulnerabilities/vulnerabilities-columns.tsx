"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntegrationsService } from "@/services/integrations.service";
import { Vulnerability } from "@/services/vulnerabilities.service";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "../ui/checkbox";

export const vulnerabilityColumns = (
  onSent: (id: string) => void,
  onGenerateDescription: (vuln: Vulnerability) => void
): ColumnDef<Vulnerability>[] => [
  {
    id: "select",
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
    cell: ({ row }) => <span>{row.getValue("title")}</span>,
  },
  {
    accessorKey: "severity",
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
  },
  {
    accessorKey: "status",
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
    id: "actions",
    header: "Действия",
    enableSorting: false,
    cell: ({ row }) => {
      const vuln = row.original;

      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={vuln.status === "SENT"}
            onClick={async () => {
              try {
                await IntegrationsService.createJiraIssue({
                  findingId: vuln.id,
                  productId: String(vuln.productId),
                });
                onSent(vuln.id);
                toast.success("Jira issue created");
              } catch (err: any) {
                toast.error(
                  err?.response?.data?.message || "Failed to create Jira issue"
                );
              }
            }}
          >
            Отправить в Jira
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateDescription(vuln)}
          >
            Сгенерировать описание
          </Button>
        </div>
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
    SENT: "bg-blue-200 text-blue-800",
    NOT_SENT: "bg-neutral-200 text-neutral-800",
  };

  return <Badge className={colors[status]}>{status}</Badge>;
}
