// app/reference/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";

export default function ReferenceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4 space-y-2 text-sm">
        <nav className="space-y-1">
          <h2 className="font-semibold text-muted-foreground">DefectDojo</h2>
          <Link
            href="/reference/defectdojo/product-types"
            className="block rounded px-2 py-1 hover:bg-muted"
          >
            Типы продуктов
          </Link>
          <Link
            href="/reference/defectdojo/products"
            className="block rounded px-2 py-1 hover:bg-muted"
          >
            Продукты
          </Link>
        </nav>

        <nav className="space-y-1">
          <h2 className="font-semibold text-muted-foreground">
            Dependency-Track
          </h2>
          <Link
            href="/reference/dependency-track/projects"
            className="block rounded px-2 py-1 hover:bg-muted"
          >
            Проекты
          </Link>
        </nav>

        <nav className="space-y-1">
          <h2 className="font-semibold text-muted-foreground">Jira</h2>
          <Link
            href="/reference/jira/custom-fields"
            className="block rounded px-2 py-1 hover:bg-muted"
          >
            Custom Fields
          </Link>
          <Link
            href="/reference/jira/projects"
            className="block rounded px-2 py-1 hover:bg-muted"
          >
            Проекты
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
