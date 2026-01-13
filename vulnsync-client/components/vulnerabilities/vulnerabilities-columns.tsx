"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Vulnerability } from "@/services/vulnerabilities.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntegrationsService } from "@/services/integrations.service";
import { toast } from "sonner";

export const vulnerabilityColumns = (
  onSent: (id: string) => void
): ColumnDef<Vulnerability>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="font-mono">{row.getValue("id")}</span>,
  },
  {
    accessorKey: "title",
    header: "Название",
  },
  {
    accessorKey: "severity",
    header: "Критичность",
    cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const vuln = row.original;

      return (
        <Button
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
