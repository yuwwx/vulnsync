"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Vulnerability } from "@/services/vulnerabilities.service";

export type Payment = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  email: string;
};

interface Props {
  data: Vulnerability[];
  columns: ColumnDef<Vulnerability>[];
  onSelectionChange?: (rows: Vulnerability[]) => void;
  bulkActionDescription?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  bulkActionSendToJira?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

type VulnerabilityMeta = {
  label?: string;
};

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> extends VulnerabilityMeta {}
}

export function VulnerabilitiesTable({
  data,
  columns,
  onSelectionChange,
  bulkActionDescription,
  bulkActionSendToJira,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      jiraIssueKey: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
  });

  const { pageIndex, pageSize } = table.getState().pagination;

  const totalRows = table.getFilteredRowModel().rows.length;
  const rowsOnPage = table.getRowModel().rows.length;

  const from = pageIndex * pageSize + 1;
  const to = pageIndex * pageSize + rowsOnPage;

  const selectedRows = table.getFilteredSelectedRowModel().rows.length;

  React.useEffect(() => {
    if (!onSelectionChange) return;

    const selected = table.getSelectedRowModel().rows.map((r) => r.original);

    onSelectionChange(selected);
  }, [rowSelection]);

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Поиск по названию..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {bulkActionDescription && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={bulkActionDescription.disabled}
            onClick={bulkActionDescription.onClick}
          >
            {bulkActionDescription.label}
          </Button>
        )}
        {bulkActionSendToJira && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={bulkActionSendToJira.disabled}
            onClick={bulkActionSendToJira.onClick}
          >
            {bulkActionSendToJira.label}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Столбцы <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const label = column.columnDef.meta?.label ?? column.id;

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-normal">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Нет результатов.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex gap-2">
          <span className="text-sm text-neutral-600">
            {from}–{to} из {totalRows}
          </span>
          <div className="text-muted-foreground flex-1 text-sm">
            {"("}
            {selectedRows} из {totalRows} строк выбрано)
          </div>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Далее
          </Button>
        </div>
      </div>
    </div>
  );
}
