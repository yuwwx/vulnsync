"use client";

import { useEffect, useState } from "react";
import { JiraCustomField } from "@/types/jira";
import { toast } from "sonner";
import { JiraReferenceService } from "@/services/reference/jira.service";
import { ReferenceLayout } from "@/components/reference/ReferenceLayout";

export default function JiraCustomFieldsPage() {
  const [data, setData] = useState<JiraCustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await JiraReferenceService.getCustomFields();
        setData(res);
      } catch {
        toast.error("Не удалось загрузить custom fields из Jira");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <ReferenceLayout<JiraCustomField>
      title="Jira · Custom Fields"
      description={
        <div className="space-y-2">
          <p>Пользовательские поля Jira.</p>
          <p>Используются при создании и синхронизации дефектов.</p>
        </div>
      }
      data={data}
      loading={loading}
      columns={[
        { key: "id", label: "ID", mono: true, width: "220px" },
        { key: "name", label: "Название" },
        { key: "schema.type", label: "Тип" },
      ]}
    />
  );
}
