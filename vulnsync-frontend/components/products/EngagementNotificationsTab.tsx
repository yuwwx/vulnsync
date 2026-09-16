"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/useAuth";
import { DefectDojoProductType } from "@/services/reference/defectdojo.service";
import {
  NotificationsService,
  ProductTypeNotification,
} from "@/services/notifications.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  productType: DefectDojoProductType;
}

export default function EngagementNotificationsTab({
  productType,
}: Props) {
  const [emails, setEmails] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!productType?.id) {
      setEmails("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    NotificationsService.getProductTypeNotification(Number(productType.id))
      .then((setting) => {
        setEmails(setting?.emails ?? "");
      })
      .catch((err) =>
        setError(`Не удалось получить настройку уведомлений: ${err}`),
      )
      .finally(() => setLoading(false));
  }, [productType?.id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const saved: ProductTypeNotification =
        await NotificationsService.saveProductTypeNotification(
          Number(productType.id),
          emails,
        );

      setEmails(saved.emails);
      toast.success("Настройка уведомлений сохранена");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить настройку уведомлений",
      );
      toast.error("Не удалось сохранить настройку уведомлений");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Загрузка настроек…</div>;

  return (
    <div className="mt-2 w-96 space-y-4">
      {error && (
        <div className="p-2 text-red-700 bg-red-100 rounded-md">{error}</div>
      )}

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Адреса получателей уведомлений об уязвимостях для выбранного типа
          продукта. Они добавляются к общему списку из DD_REPORT_MAIL_TO.
        </div>
        <Textarea
          placeholder="user1@example.com, user2@example.com"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
        />
      </div>

      {isAdmin && (
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      )}
    </div>
  );
}
