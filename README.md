# VulnSync

Сервис для ручной синхронизации уязвимостей между внешними системами: **DefectDojo**, **Dependency-Track** и **Jira**.

## Возможности

- **Уязвимости** — список продуктов DefectDojo (`GET /api/v2/product_types`) и уязвимостей выбранного продукта (`GET /api/v2/findings`). Создание задачи в Jira по выбранной уязвимости (`POST /rest/api/2/issue/`) при настроенном маппинге. Статус каждой уязвимости: отправлена / не отправлена (по данным собственной БД).
- **Маппинги**
  - *DefectDojo → Jira*: сопоставление product_type из DefectDojo с полями задачи Jira (project.key, issuetype.name, customfield_* и др.) с сохранением настроек.
  - *Dependency-Track → DefectDojo*: выбор проекта Dependency-Track и продукта DefectDojo, экспорт уязвимостей проекта (`GET /api/v1/finding/project/{uuid}/export`) и импорт в DefectDojo (`POST /api/v2/import-scan/`).
- **Справочники** — просмотр данных внешних систем: продукты и типы продуктов DefectDojo, проекты Dependency-Track, проекты и кастомные поля Jira.
- **Почтовые отчёты** — периодическая рассылка сводки по уязвимостям за вчера (Cron + SMTP).
- **Журнал действий (логи)** — история операций, выполняемых через сервис.
- **Настройки** — конфигурация адресов и API-токенов DefectDojo, Jira, Dependency-Track.

## Технологический стек

| Слой | Технологии |
| --- | --- |
| Бэкенд | NestJS, Prisma, Passport.js, axios, class-validator, class-transformer |
| Фронтенд | Next.js, shadcn/ui, TailwindCSS |
| База данных | PostgreSQL |
| Аутентификация | Локальная, LDAP (Active Directory) |
| Развёртывание | Docker Compose, Nginx (TLS) |

Монорепозиторий: `vulnsync-backend` + `vulnsync-frontend` (npm workspaces).

## Структура

```
vulnsync/
├── vulnsync-backend/        # NestJS API
│   └── src/
│       ├── auth/            # Аутентификация (локальная + LDAP), JWT
│       ├── integrations/    # Клиенты внешних API (DefectDojo, Jira, Dependency-Track)
│       ├── vulnerabilities/ # Продукты и уязвимости DefectDojo
│       ├── mappings/        # Маппинги DD→Jira и DT→DD
│       ├── vulnerability-sync/ # Синхронизация DT → DefectDojo
│       ├── notifications/   # Уведомления по типам продуктов
│       ├── reports/         # Почтовые отчёты
│       ├── logs/            # Журнал действий
│       ├── settings/        # Настройки интеграций
│       └── prisma/          # Модуль доступа к БД
├── vulnsync-frontend/       # Next.js UI
├── nginx/                   # Шаблон конфигурации Nginx + SSL
├── scripts/                 # Вспомогательные скрипты
└── docker-compose.yml
```

Архитектурные правила: отдельная папка под каждый модуль, UUID в качестве идентификаторов; бизнес-логика в сервисах — в контроллерах запрещены бизнес-логика и прямые вызовы внешних API.

## Быстрый старт (разработка)

Требования: Node.js 20+, npm, Docker (для PostgreSQL).

```bash
# 1. Установить зависимости
npm install

# 2. Настроить переменные окружения
cp .env.dev.example .env.dev

# 3. Поднять PostgreSQL
docker compose up postgres -d

# 4. Применить миграции и сгенерировать Prisma-клиент
npm run prisma:migrate:dev
npm run prisma:generate

# 5. Запустить бэкенд и фронтенд одновременно
npm run dev
```

- Фронтенд: http://localhost:3000
- Бэкенд API: http://localhost:3001/api

## Запуск в Docker (продакшен)

```bash
cp .env.example .env
# заполнить .env: домен, SSL-сертификаты, JWT_SECRET, SMTP, LDAP и т.д.
docker compose up -d --build
```

Поднимаются сервисы: `postgres`, `backend`, `frontend`, `nginx` (порты 80/443, TLS-терминация).

## Переменные окружения

Основные переменные (см. `.env.example` / `.env.dev.example`):

| Переменная | Описание |
| --- | --- |
| `DATABASE_URL`, `POSTGRES_*` | Подключение к PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT |
| `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` | URL фронтенда и API для CORS/клиента |
| `LDAP_*` | Подключение к LDAP/AD и маппинг групп (admin/user/viewer) |
| `SMTP_*`, `DD_REPORT_*` | Почтовые отчёты: сервер, ящики, расписание Cron |
| `USE_NEXUS`, `NEXUS_NPM_REGISTRY` | Использование корпоративного Nexus-реестра npm при сборке образов |
| `SERVER_NAME`, `SSL_CERT_PATH`, `SSL_KEY_PATH` | Домен и SSL-сертификаты для Nginx |

## Скрипты

| Команда | Описание |
| --- | --- |
| `npm run dev` | Запуск бэкенда и фронтенда в dev-режиме |
| `npm run build` / `start` (backend:, frontend:) | Сборка и запуск в prod-режиме |
| `npm run backend:test` | Тесты бэкенда |
| `npm run lint` | Линтинг фронтенда и бэкенда |
| `npm run prisma:migrate:dev` | Миграции Prisma (использует `.env.dev`) |
| `npm run prisma:generate` | Генерация Prisma-клиента |
| `npm run mock:ml` | Мок-сервер для локальной разработки |
