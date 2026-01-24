"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";

const navItems = [
  { href: "/vulnerabilities", label: "Уязвимости" },
  { href: "/integrations", label: "Интеграции" },
  { href: "/settings", label: "Параметры" },
  { href: "/logs", label: "События" },
  { href: "/reference", label: "Справочники" },
];

export function Header() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("username");
    const name = localStorage.getItem("displayName");
    setIsAuthenticated(!!token);
    setUsername(user);
    setDisplayName(name);
  }, []);

  function logout() {
    AuthService.logout();
    setIsAuthenticated(false);
    window.location.href = "/login";
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between relative">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg hover:opacity-80">
          VulnSync
        </Link>

        {/* Navigation */}
        {isAuthenticated && (
          <nav className="absolute left-1/2 transform -translate-x-1/2 flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium text-muted-foreground hover:text-primary",
                  pathname.startsWith(item.href) && "text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Auth info */}
        <div className="flex items-center gap-2">
          {isAuthenticated && username && (
            <span className="text-sm text-muted-foreground">{`${displayName || ""} (${username})`}</span>
          )}

          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={logout}>
              Выйти
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
