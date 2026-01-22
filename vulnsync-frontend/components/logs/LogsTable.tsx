"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogEntry } from "@/services/logs.service";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  logs: LogEntry[];
  pageSize?: number;
}

export function LogsTable({ logs, pageSize = 15 }: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(logs.length / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, logs.length);

  const currentLogs = logs.slice(startIndex - 1, endIndex);

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>User Agent</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {currentLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {dayjs(log.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              </TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.meta?.username ?? "—"}</TableCell>
              <TableCell>{log.ip ?? "—"}</TableCell>
              <TableCell>{log.meta?.result ?? "—"}</TableCell>
              <TableCell className="truncate max-w-xs">
                {log.meta?.userAgent ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {logs.length > pageSize && (
        <div className="flex items-center justify-between mt-2 px-4 py-2 border-t border-neutral-200 bg-neutral-50 rounded-b-md">
          <span className="text-sm text-neutral-600">
            {startIndex}–{endIndex} из {logs.length}
          </span>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={prevPage}
              disabled={page === 1}
            >
              Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={nextPage}
              disabled={page === totalPages}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
