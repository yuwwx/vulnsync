"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/useAuth";
import {
  DefectDojoProductType,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";
import { ManagedUser, UsersService } from "@/services/users.service";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [productTypes, setProductTypes] = useState<DefectDojoProductType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const isRestricted = selectedUser?.role === "USER";

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/vulnerabilities");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    Promise.all([UsersService.list(), DefectDojoReferenceService.getProductTypes()])
      .then(([loadedUsers, loadedTypes]) => {
        setUsers(loadedUsers);
        setProductTypes(loadedTypes);
      })
      .catch(() => setError("Не удалось загрузить пользователей и группы продуктов"))
      .finally(() => setLoading(false));
  }, []);

  function selectUser(user: ManagedUser) {
    setSelectedUserId(user.id);
    setSelectedTypeIds(new Set(user.allowedProductTypeIds));
  }

  function toggleType(id: number) {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function save() {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    try {
      const updated = await UsersService.updateProductTypes(
        selectedUser.id,
        Array.from(selectedTypeIds),
      );
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? updated : user)),
      );
      setSelectedTypeIds(new Set(updated.allowedProductTypeIds));
      toast.success("Доступ к группам продуктов обновлён");
    } catch {
      toast.error("Не удалось сохранить доступ");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Доступы к группам продуктов</h1>

      {loading ? (
        <div className="text-neutral-500">Загрузка…</div>
      ) : error ? (
        <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>
      ) : (
        <div className="flex gap-6">
          <ul className="min-w-64 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            {users.map((user) => (
              <li
                key={user.id}
                className={`p-2 rounded cursor-pointer text-sm ${
                  selectedUserId === user.id
                    ? "bg-neutral-600 text-white"
                    : "hover:bg-muted"
                }`}
                onClick={() => selectUser(user)}
              >
                <div className="font-medium">{user.username}</div>
                <div
                  className={`text-xs ${
                    selectedUserId === user.id
                      ? "text-neutral-200"
                      : "text-muted-foreground"
                  }`}
                >
                  {user.displayName || user.email || "—"}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex-1 space-y-4">
            {!selectedUser ? (
              <div className="text-neutral-500">
                Выберите пользователя, чтобы настроить доступ
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{selectedUser.username}</span>
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                  {!isRestricted && (
                    <span className="text-sm text-muted-foreground">
                      Роль не ограничена группами продуктов
                    </span>
                  )}
                </div>

                <div className="border rounded-md p-4 space-y-3">
                  <div className="text-sm font-medium">Группы продуктов</div>
                  {isRestricted && productTypes.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      В DefectDojo нет доступных групп продуктов
                    </div>
                  )}
                  {productTypes.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Checkbox
                        checked={selectedTypeIds.has(type.id)}
                        disabled={!isRestricted}
                        onCheckedChange={() => toggleType(type.id)}
                      />
                      <span>{type.name}</span>
                      <span className="text-xs text-muted-foreground">
                        #{type.id}
                      </span>
                    </label>
                  ))}
                </div>

                <Button
                  onClick={save}
                  disabled={!isRestricted || saving}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
