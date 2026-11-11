"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DefectDojoReferenceService,
  type DefectDojoDashboard,
} from "@/services/reference/defectdojo.service";
import { useAuth } from "@/lib/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low", "Info"] as const;

const SEVERITY_BAR: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
  Info: "bg-neutral-400",
};

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isUser } = useAuth();
  const [data, setData] = useState<DefectDojoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUser) {
      router.replace("/vulnerabilities");
    }
  }, [isUser, router]);

  useEffect(() => {
    if (isUser) {
      return;
    }

    let cancelled = false;

    DefectDojoReferenceService.getDashboard()
      .then((dashboard) => {
        if (!cancelled) {
          setData(dashboard);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить данные дашборда");
          toast.error("Не удалось загрузить данные дашборда");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isUser]);

  if (isUser) {
    return null;
  }

  const severity = data?.severity ?? {};
  const severityTotal = SEVERITY_ORDER.reduce(
    (sum, item) => sum + (severity[item] ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Дашборд</h1>

      {loading ? (
        <div className="text-neutral-500">Загрузка…</div>
      ) : error ? (
        <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Группы продуктов" value={data.productTypes} />
            <StatCard title="Продукты" value={data.products} />
            <StatCard
              title="Открытые уязвимости"
              value={data.totalFindings}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Уязвимости по критичности</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SEVERITY_ORDER.map((item) => {
                const count = severity[item] ?? 0;
                const percent =
                  severityTotal > 0
                    ? Math.round((count / severityTotal) * 100)
                    : 0;

                return (
                  <div key={item} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-muted">
                      <div
                        className={`h-2 rounded ${SEVERITY_BAR[item]}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
