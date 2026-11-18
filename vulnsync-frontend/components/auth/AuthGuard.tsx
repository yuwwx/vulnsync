"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Токен в HttpOnly-куке, поэтому для UI проверяем сохранённый профиль.
    const username = localStorage.getItem("username");

    if (!username && pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [pathname, router]);

  return <>{children}</>;
}
