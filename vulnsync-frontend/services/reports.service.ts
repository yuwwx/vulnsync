// services/reports.service.ts
import { api } from "./api";

export type FindingsReportScope = {
  productTypeId?: number;
  productId?: number;
};

export const ReportsService = {
  // Полный отчёт ставится в очередь на бэкенде: письмо придёт примерно через 5 минут
  async runFullFindingsReport(
    scope: FindingsReportScope,
  ): Promise<{ status: string; runAt: string }> {
    const { data } = await api.post<{ status: string; runAt: string }>(
      "/reports/findings/run",
      scope,
    );
    return data;
  },
};
