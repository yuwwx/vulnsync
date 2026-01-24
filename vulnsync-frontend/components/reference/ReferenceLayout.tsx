"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReferenceColumn = {
  key: string;
  label: string;
  mono?: boolean;
  width?: string;
};

type Props<T> = {
  title: string;
  description?: ReactNode;
  data: T[];
  loading?: boolean;
  columns: ReferenceColumn[];
};

function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function ReferenceLayout<T>({
  title,
  description,
  data,
  loading,
  columns,
}: Props<T>) {
  const [rawOpen, setRawOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && (
            <div className="mt-2 text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => setRawOpen(true)}>
          Raw JSON
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-medium"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Загрузка…
                </td>
              </tr>
            ) : (
              data.map((row: any, i) => (
                <tr key={i} className="border-t">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 ${
                        col.mono ? "font-mono text-xs" : ""
                      }`}
                    >
                      {getNestedValue(row, col.key) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Raw JSON Modal */}
      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Raw JSON</DialogTitle>
          </DialogHeader>

          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[80vh]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
