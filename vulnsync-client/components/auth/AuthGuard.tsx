"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
