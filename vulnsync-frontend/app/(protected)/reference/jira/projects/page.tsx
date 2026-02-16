"use client";

import { ReferenceLayout } from "@/components/reference/ReferenceLayout";
import { JiraReferenceService } from "@/services/reference/jira.service";
import { JiraProject } from "@/types/jira";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function JiraProjectsPage() {
  const [data, setData] = useState<JiraProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await JiraReferenceService.getProjects();
        setData(res);
      } catch {
        toast.error("Не удалось загрузить projects из Jira");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <ReferenceLayout<JiraProject>
      title="Jira · Проекты"
      description={
        <div className="space-y-2">
          <p>Список проектов, доступных в Jira.</p>
          <p>Используются при создании дефектов.</p>
        </div>
      }
      data={data}
      loading={loading}
      columns={[
        {
          key: "key",
          label: "Ключ",
          mono: true,
          width: "120px",
        },
        {
          key: "name",
          label: "Название",
        },
        {
          key: "projectTypeKey",
          label: "Тип проекта",
          width: "180px",
        },
        {
          key: "id",
          label: "ID",
          mono: true,
          width: "200px",
        },
      ]}
    />
  );
}
