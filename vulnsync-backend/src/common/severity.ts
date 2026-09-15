// Единый порядок важности severities в DefectDojo.
// Ключи в нижнем регистре: сравнение всегда идёт после trim().toLowerCase(),
// т.к. DefectDojo возвращает значения вида 'Critical', 'High' и т.п.
// Info/None/Unknown считаются «не настоящими» severity и дают вес 0.
export const SEVERITY_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  moderate: 3,
  low: 2,
};

export function severityWeight(severity?: string | null): number {
  if (!severity) {
    return 0;
  }

  return SEVERITY_ORDER[severity.toString().trim().toLowerCase()] ?? 0;
}
