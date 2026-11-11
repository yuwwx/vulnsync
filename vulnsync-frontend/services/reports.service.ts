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

  // CSV отдаёт сам DefectDojo (v3 export.csv). Скачиваем через blob,
  // потому что токен передаётся в Authorization, а не в cookie.
  async exportFindingsCsv(scope: FindingsReportScope): Promise<void> {
    const response = await api.get<Blob>("/reports/findings/export.csv", {
      params: scope,
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"];
    const filename =
      typeof disposition === "string"
        ? disposition.match(/filename="?([^"]+)"?/)?.[1]
        : undefined;

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? "findings.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
