import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

// Сортировка — серверная (o-параметр DD, см. vulnerabilities.service бэкенда),
// поэтому sorting-фичи не подключены. Выделение строк управляется страницей
// через selectedIds (родительская карта) — rowSelectionFeature не подключён.
export const vulnerabilityTableFeatures = tableFeatures({
  rowPaginationFeature,
  columnVisibilityFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
