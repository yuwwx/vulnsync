'use client';

import { useEffect, useState } from 'react';
import { LogsService, LogEntry } from '@/services/logs.service';
import { LogsTable } from '@/components/dashboard/LogsTable';

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    LogsService.getLatest()
      .then(setLogs)
      .catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading logs…</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="rounded-md border">
        <LogsTable logs={logs} />
      </div>
    </div>
  );
}
