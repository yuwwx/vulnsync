"use client";

import { useState } from "react";
import { AuthService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); // ⛔️ чтобы не было перезагрузки страницы
    await AuthService.login({ username, password });
    window.location.href = "/vulnerabilities";
  }

  return (
    <form onSubmit={submit} className="flex items-center justify-center">
      <div className="w-96 space-y-4">
        <h1 className="text-xl font-bold">VulnSync</h1>

        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* type="submit" — ключевой момент */}
        <Button type="submit" className="w-full">
          Login
        </Button>
      </div>
    </form>
  );
}
