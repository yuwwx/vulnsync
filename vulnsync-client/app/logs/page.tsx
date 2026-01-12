"use client";

import { useEffect, useState } from "react";
import { LogsService, LogEntry } from "@/services/logs.service";
import { LogsTable } from "@/components/logs/LogsTable";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    LogsService.getLatest()
      .then(setLogs)
      .catch((err) => setError(`Failed to load logs: ${err}`))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading logs…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Logs</h1>

      <div className="rounded-md border">
        <LogsTable logs={logs} />
      </div>
    </div>
  );
}
