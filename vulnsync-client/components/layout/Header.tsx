"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";

const navItems = [
  { href: "/logs", label: "Logs" },
  { href: "/vulnerabilities", label: "Vulnerabilities" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // проверяем токен на клиенте
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("access_token"));
  }, []);

  function logout() {
    AuthService.logout();
    setIsAuthenticated(false);
    window.location.href = "/login";
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg hover:opacity-80">
          VulnSync
        </Link>

        {/* Navigation — только если вошёл */}
        {isAuthenticated && (
          <nav className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium text-muted-foreground hover:text-primary",
                  pathname.startsWith(item.href) && "text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Auth button */}
        {isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
