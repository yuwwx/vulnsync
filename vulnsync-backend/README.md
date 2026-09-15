# VulnSync Backend

NestJS API для сервиса VulnSync: синхронизация уязвимостей между **DefectDojo**, **Dependency-Track** и **Jira**. Общее описание проекта — в [README корня репозитория](../README.md).

## Структура (`src/`)

| Папка | Назначение |
| --- | --- |
| `auth/` | Аутентификация: локальная и LDAP (Active Directory), JWT, стратегии Passport |
| `integrations/` | Клиенты внешних API: `defectdojo/`, `dependency-track/`, `jira/` (клиент + сервис + контроллер на каждую систему) |
| `vulnerabilities/` | Список продуктов и уязвимостей DefectDojo, AI-оценка применимости уязвимости |
| `vulnerability-sync/` | Отправка уязвимостей в Jira и статусы синхронизации (commands, create-issue) |
| `mappings/` | Маппинги: DefectDojo → Jira и Dependency-Track → DefectDojo |
| `notifications/` | Почтовые уведомления по типам продуктов |
| `reports/` | Ежедневный отчёт об уязвимостях за вчера (Cron + SMTP) |
| `settings/` | Настройки интеграций (адреса и API-токены) |
| `logs/` | Журнал действий пользователей |
| `prisma/` | Модуль доступа к PostgreSQL (Prisma) |
| `common/` | Общее: guards, декораторы, interceptors, enums |

## Архитектурные правила

- Одна папка — один модуль: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.
- Бизнес-логика только в сервисах; в контроллерах не должно быть логики и прямых вызовов внешних API.
- UUID — идентификаторы сущностей; идентификаторы внешних систем (findingId, productTypeId) — числа.

## Запуск в разработке

Из корня репозитория (Node.js 20+, Docker для PostgreSQL):

```bash
npm install
cp .env.dev.example .env.dev
docker compose up postgres -d
npm run prisma:migrate:dev
npm run prisma:generate
npm run dev   # бэкенд + фронтенд вместе
```

Бэкенд: http://localhost:3001/api, Swagger: http://localhost:3001/swagger.

Отдельно бэкендом: `npm --workspace vulnsync-backend run start:dev`.

## Миграции Prisma

```bash
npm run prisma:migrate:dev   # создать/применить миграцию (использует .env.dev)
npm run prisma:generate      # перегенерировать клиент после изменений схемы
```

Схема: `prisma/schema.prisma`.

## Полезное

- `npm run lint` — линт (из корня: `npm run lint`).
- `npm run backend:test` — тесты (jest).
- Переменные окружения — см. `.env.dev.example` и таблицу в корневом README.
