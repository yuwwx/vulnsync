"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";
import { AuthError, AuthService } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";

// Сетка на весь экран, как на лендинге (fixed, чтобы не ограничиваться <main>)
const gridBackground: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const mounted = useMounted();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Уже авторизованного не показываем форму логина повторно.
  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [mounted, isAuthenticated, router]);

  if (mounted && isAuthenticated) {
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await AuthService.login({ username, password });
      window.location.href = "/dashboard";
    } catch (e) {
      if (e instanceof AuthError) {
        setError(e.message);
      } else {
        setError("Ошибка аутентификации");
      }
    } finally {
      setLoading(false);
    }
  }

  const hasError = Boolean(error);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-0"
        style={gridBackground}
      />

      <form
        onSubmit={submit}
        className="relative z-10 flex min-h-[calc(100vh-6.5rem)] items-center justify-center"
      >
        <div className="w-96 space-y-4 rounded-xl border bg-card p-6 shadow-lg">
          <h1 className="text-xl font-bold">Вход</h1>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            placeholder="Логин"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            className={cn(hasError && "border-red-500")}
          />

          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className={cn(hasError && "border-red-500")}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </Button>
        </div>
      </form>
    </div>
  );
}
