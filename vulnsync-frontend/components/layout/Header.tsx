"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/vulnerabilities", label: "Уязвимости" },
  { href: "/products", label: "Продукты" },
  { href: "/settings", label: "Параметры", adminOnly: true },
  { href: "/logs", label: "События", adminOnly: true },
  { href: "/reference", label: "Справочники" },
];

export function Header() {
  const pathname = usePathname();
  const { isAdmin, isAuthenticated, username, displayName } = useAuth();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function logout() {
    AuthService.logout();
    window.location.href = "/login";
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between relative">
        <Link href="/" className="font-bold text-lg hover:opacity-80">
          VulnSync
        </Link>

        {mounted && isAuthenticated && (
          <nav className="absolute left-1/2 transform -translate-x-1/2 flex gap-6">
            {filteredNavItems.map((item) => (
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

        <div className="flex items-center gap-2">
          {mounted && isAuthenticated && username && (
            <span className="text-sm text-muted-foreground">
              {`${displayName || ""} (${username})`}
            </span>
          )}

          {mounted && isAuthenticated ? (
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
