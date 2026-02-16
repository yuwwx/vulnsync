"use client";

import { ReferenceLayout } from "@/components/reference/ReferenceLayout";
import {
  DependencyTrackProject,
  DependencyTrackReferenceService,
} from "@/services/reference/dependency-track.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DependencyTrackProjectsPage() {
  const [data, setData] = useState<DependencyTrackProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DependencyTrackReferenceService.getProjects()
      .then(setData)
      .catch(() => toast.error("Не удалось загрузить projects"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReferenceLayout<DependencyTrackProject>
      title="Dependency-Track · Проекты"
      description="Список проектов Dependency-Track"
      data={data}
      loading={loading}
      columns={[
        { key: "uuid", label: "UUID", mono: true, width: "220px" },
        { key: "name", label: "Название" },
        { key: "version", label: "Версия" },
      ]}
    />
  );
}
