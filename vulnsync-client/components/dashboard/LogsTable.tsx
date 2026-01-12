"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogEntry } from '@/services/logs.service';
import dayjs from 'dayjs';

interface Props {
  logs: LogEntry[];
}

export function LogsTable({ logs }: Props) {
  return (
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
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
            <TableCell>{log.action}</TableCell>
            <TableCell>{log.meta?.username ?? '—'}</TableCell>
            <TableCell>{log.ip ?? '—'}</TableCell>
            <TableCell>{log.meta?.result ?? '—'}</TableCell>
            <TableCell className="truncate max-w-xs">{log.meta?.userAgent ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
