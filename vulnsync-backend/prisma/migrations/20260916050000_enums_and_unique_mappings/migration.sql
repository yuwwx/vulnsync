-- Роли и типы интеграций как enum'ы, уникальность настроек и маппингов.
-- Каждый шаг идемпотентен: миграция уже частично применялась на проме
-- (enum'ы и конвертация User.role успели примениться до ошибки в данных).

DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'VIEWER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL; -- уже создан при прошлом прогоне
END $$;

DO $$
BEGIN
  CREATE TYPE "IntegrationType" AS ENUM ('ML', 'DEFECTDOJO', 'DEPENDENCY_TRACK', 'JIRA');
EXCEPTION
  WHEN duplicate_object THEN NULL; -- уже создан при прошлом прогоне
END $$;

-- User.role: String -> Role
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- IntegrationSetting.type: String -> IntegrationType, одна настройка на интеграцию
ALTER TABLE "IntegrationSetting" ALTER COLUMN "type" TYPE "IntegrationType" USING "type"::"IntegrationType";
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSetting_type_key" ON "IntegrationSetting"("type");

-- Один маппинг Jira на тип продукта
ALTER TABLE "JiraMapping" ALTER COLUMN "ddProductTypeId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "JiraMapping_ddProductTypeId_key" ON "JiraMapping"("ddProductTypeId");

-- Один маппинг Dependency-Track на продукт
ALTER TABLE "DependencyTrackMapping" ALTER COLUMN "ddProductId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "DependencyTrackMapping_ddProductId_key" ON "DependencyTrackMapping"("ddProductId");

-- Log: append-only журнал, updatedAt не нужен; индекс для сортировки по времени
ALTER TABLE "Log" DROP COLUMN IF EXISTS "updatedAt";
CREATE INDEX IF NOT EXISTS "Log_createdAt_idx" ON "Log"("createdAt");
