"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  function logout() {
    AuthService.logout();
    window.location.href = "/login";
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-lg">
          <Link href="/" className="text-inherit no-underline hover:opacity-80">
            VulnSync
          </Link>
        </div>

        {/* Navigation */}
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

        {/* User actions */}
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
