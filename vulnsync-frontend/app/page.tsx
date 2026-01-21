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
import { ArrowRight, Database, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    title: "Синхронизация уязвимостей",
    description:
      "Агрегация данных из всех источников (DefectDojo, DT, Jira и др.).",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: "Единый дашборд",
    description:
      "Все уязвимости в одном месте с фильтрами, статусами и приоритетами.",
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    title: "История и аудит",
    description:
      "Логирование изменений и отслеживание статусов по каждому тикету.",
    icon: <Database className="w-5 h-5" />,
  },
];

const integrations = ["DefectDojo", "DependencyTrack", "Jira"];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="container mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="mb-4">VulnSync</Badge>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Объединяй уязвимости <br /> в одном месте
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Синхронизация между системами, единый дашборд, история изменений и
              удобный workflow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vulnerabilities">
                <Button size="lg">
                  Перейти к уязвимостям <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg">
                  Документация
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Что внутри VulnSync</CardTitle>
                <CardDescription>
                  Автоматизация, удобство и контроль.
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
                <CardTitle>Интеграции</CardTitle>
                <CardDescription>
                  Подключи источники данных за пару минут
                </CardDescription>
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

      <section className="container mx-auto py-16">
        <h2 className="text-3xl font-bold text-center">Как это работает</h2>
        <p className="text-center text-muted-foreground mt-2">
          Быстро настраивается и сразу приносит пользу
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Подключи источники</CardTitle>
              <CardDescription>
                Добавь интеграции и настрои синхронизацию
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Поддержка DefectDojo, DependencyTrack, Jira и других систем.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Синхронизируй данные</CardTitle>
              <CardDescription>
                Объединяй уязвимости в единый поток
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Уведомления, статусы, приоритеты и история изменений.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Управляй рисками</CardTitle>
              <CardDescription>Отслеживай и закрывай задачи</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Единый дашборд с фильтрами, графиками и экспортом.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto py-16">
        <div className="rounded-2xl border bg-card p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold">Готов начать?</h3>
            <p className="text-muted-foreground mt-2">
              Настрой VulnSync за 5 минут и получи единый контроль над
              уязвимостями.
            </p>
          </div>
          <Link href="/settings">
            <Button size="lg">
              Начать настройку <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
