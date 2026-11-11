"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, GitBranch, Search, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { type CSSProperties } from "react";

const features = [
  {
    title: "Список уязвимостей",
    description:
      "Поиск, сортировка и пагинация — без тяжёлых страниц DefectDojo.",
    icon: <Search className="w-5 h-5" />,
  },
  {
    title: "Сканирования и тесты",
    description:
      "Drill-down по engagements и тестам, фильтр по продукту или тесту.",
    icon: <GitBranch className="w-5 h-5" />,
  },
  {
    title: "Jira и отчёты",
    description:
      "Отправка в Jira, синхронизация статусов и отчёты по продукту на почту.",
    icon: <Send className="w-5 h-5" />,
  },
  {
    title: "AI-описания",
    description: "Генерация описаний и ответы AI по выбранным уязвимостям.",
    icon: <Sparkles className="w-5 h-5" />,
  },
];

const integrations = ["DefectDojo", "DependencyTrack", "Jira"];

// Сетка на весь экран (fixed, чтобы не ограничиваться контейнером <main>)
const gridBackground: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

export default function Home() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-0"
        style={gridBackground}
      />

      <section className="container relative z-10 mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              VulnSync
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Смотри уязвимости, разбирай их по продуктам и сканированиям,
              отправляй в Jira и получай отчёты — в простом интерфейсе.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Открыть дашборд <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/vulnerabilities">
                <Button size="lg" variant="outline">
                  К уязвимостям
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Что внутри</CardTitle>
                <CardDescription>
                  Всё для работы с уязвимостями в одном месте.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {features.map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="mt-1">{f.icon}</div>
                    <div>
                      <div className="font-semibold">{f.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {f.description}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Источники данных</CardTitle>
                <CardDescription>Подключаются за пару минут</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {integrations.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
