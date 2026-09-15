// Порядок критичностей от высшей к низшей — как их отдаёт DefectDojo.
// Используется для сортировки таблицы и выбора новой критичности.
export const SEVERITY_ORDER: readonly string[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
];
