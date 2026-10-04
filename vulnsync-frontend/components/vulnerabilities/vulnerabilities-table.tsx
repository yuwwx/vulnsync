"use client";

import {
  ColumnDef,
  useTable,
  flexRender,
  type SortingState,
  type ColumnVisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ListFilter } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { vulnerabilityTableFeatures } from "./vulnerabilities-table-config";

export type BulkAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

interface Props {
  data: Vulnerability[];
  columns: ColumnDef<typeof vulnerabilityTableFeatures, Vulnerability>[];
  onSelectionChange?: (rows: Vulnerability[]) => void;
  // Сколько строк выбрано всего (включая другие страницы/поиски)
  selectedCount?: number;
  bulkActions?: BulkAction[];
  // Отдельная кнопка рядом с «Групповые действия» (не зависит от выделения строк)
  fullReportAction?: BulkAction;
  // Серверная пагинация: таблица не режет данные сама
  serverPagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  // Серверный поиск по названию (иконтейнс на бэке)
  onSearch?: (search: string) => void;
}

declare module "@tanstack/table-core" {
  interface ColumnMeta<TFeatures, TData, TValue> {
    label?: string;
  }
}

export function VulnerabilitiesTable({
  data,
  columns,
  onSelectionChange,
  selectedCount,
  bulkActions,
  fullReportAction,
  serverPagination,
  onSearch,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({
      jiraIssueKey: false,
    });
  // Выделение — управляемое извне через selectedIds (переживает пагинацию
  // и поиск). rowSelection-стейт таблицы НЕ используем: controlled-state
  // в этом адаптере перепубликовывается на каждый рендер и зацикливает
  // обновления. Чекбоксы читают selectedIds напрямую (см. cell колонок),
  // клик — toggle в родительскую карту.
  const table = useTable({
    features: vulnerabilityTableFeatures,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
      ...(serverPagination
        ? {
            pagination: {
              pageIndex: serverPagination.page - 1,
              pageSize: serverPagination.limit,
            },
          }
        : {}),
    },
    ...(serverPagination
      ? {
          manualPagination: true,
          pageCount: Math.max(
            1,
            Math.ceil(serverPagination.total / serverPagination.limit),
          ),
        }
      : {}),
  });

  const totalRows = serverPagination ? serverPagination.total : data.length;
  const rowsOnPage = table.getRowModel().rows.length;

  const from = serverPagination
    ? (serverPagination.page - 1) * serverPagination.limit + 1
    : 1;
  const to = serverPagination
    ? (serverPagination.page - 1) * serverPagination.limit + rowsOnPage
    : rowsOnPage;

  // Счётчик выбранных по всему набору (родитель считает по своей карте)
  const selectedRows = selectedCount ?? 0;

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <DebouncedSearchInput onSearch={onSearch ?? (() => {})} />
        {bulkActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                Групповые действия ({selectedRows}) <ListFilter />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[250px]">
              {bulkActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {fullReportAction && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={fullReportAction.disabled}
            onClick={fullReportAction.onClick}
          >
            {fullReportAction.label}
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
                <TableRow key={row.id}>
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
            {totalRows > 0 ? `${from}–${to} из ${totalRows}` : "0 из 0"}
          </span>
          <div className="text-muted-foreground flex-1 text-sm">
            {"("}
            {selectedRows} выбрано)
          </div>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.page - 1)
                : table.previousPage()
            }
            disabled={
              serverPagination ? serverPagination.page <= 1 : !table.getCanPreviousPage()
            }
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.page + 1)
                : table.nextPage()
            }
            disabled={
              serverPagination
                ? serverPagination.page >=
                  Math.ceil(serverPagination.total / serverPagination.limit)
                : !table.getCanNextPage()
            }
          >
            Далее
          </Button>
        </div>
      </div>
    </div>
  );
}

// Поиск с задержкой: не дёргаем тяжёлый запрос на каждый символ.
// Отправляем только изменившееся значение: запуск эффекта на монтировании
// (или после ремонтинга) пустой строкой запрос не инициирует.
function DebouncedSearchInput({ onSearch }: { onSearch: (search: string) => void }) {
  const [value, setValue] = React.useState("");
  const onSearchRef = React.useRef(onSearch);
  const lastFiredRef = React.useRef(value);

  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== lastFiredRef.current) {
        lastFiredRef.current = value;
        onSearchRef.current(value);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <Input
      placeholder="Поиск по названию..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="max-w-sm"
    />
  );
}
