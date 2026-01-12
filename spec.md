# Название проекта

VulnSync

# Цель проекта

Сервис для ручной синхронизации уязвимостей между внешними системами (DefectDojo, Dependency-Track, Jira).

# Технологический стек

Бэкенд: NestJS, Prisma, Passport.js, axios, class-validator, class-transformer
Фронтенд: NextJS, shadcn/ui, TailwindCSS
База данных: PostgreSQL
Развертывание: Docker Compose
Аутентификация: Локальная, LDAP (Active Directory)
Монорепозиторий (back + front)

# Архитектурные требования

Отдельная папка для каждого модуля. Использование UUID. Запрещено: бизнес-логика в контроллерах, прямые вызовы внешних API из контроллеров

# Разделы

## Дашборд

Последние действия (данные из таблицы логов)

## Уязвимости

Список продуктов DefectDojo (DefectDojo `GET /api/v2/product_types`)
Список уязвимостей выбранного продукта (DefectDojo `GET /api/v2/findings?product_name=name`)
Кнопка Создать задачу в Jira создаёт одну issue по выбранной уязвимости, если настроен маппинг (Jira `POST /rest/api/2/issue/`)
Статус каждой уязвимости: отправлена / не отправлена (информация из своей БД)

## Интеграции (2 подраздела)

### DefectDojo -> Jira:

Настройка маппинга: product_type из DefectDojo и project.key, issuetype.name, customfield_X и других полей (задаются вручную) из Jira
Сохранение настроек

### Dependency-Track -> DefectDojo:

Выбор проекта Dependency-Track (Dependency-Track `GET /api/v1/project?excludeInactive=true`) и продукта DefectDojo (DefectDojo `GET /api/v2/product_types`)
Кнопка Импортировать уязвимости экспортирует узявимости проекта из Dependency-Track (Dependency-Track `GET /api/v1/finding/project/{uuid}/export`) и импортирует в DefectDojo (DefectDojo `POST /api/v2/import-scan/`)

## Настройки

Конфигурация адресов и API токенов для DefectDojo, Jira, Dependency-Track
