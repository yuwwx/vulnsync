"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthError, AuthService } from "@/services/auth.service";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = await AuthService.login({ username, password });
      window.location.href =
        auth.role === "USER" ? "/vulnerabilities" : "/dashboard";
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
    <form onSubmit={submit} className="flex items-center justify-center">
      <div className="w-96 space-y-4">
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
  );
}
