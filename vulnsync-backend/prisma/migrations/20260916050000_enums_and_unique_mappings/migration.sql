-- Роли и типы интеграций как enum'ы, уникальность настроек и маппингов
CREATE TYPE "Role" AS ENUM ('USER', 'VIEWER', 'ADMIN');

CREATE TYPE "IntegrationType" AS ENUM ('ML', 'DEFECTDOJO', 'DEPENDENCY_TRACK', 'JIRA');

-- User.role: String -> Role
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- IntegrationSetting.type: String -> IntegrationType, одна настройка на интеграцию
ALTER TABLE "IntegrationSetting" ALTER COLUMN "type" TYPE "IntegrationType" USING "type"::"IntegrationType";
CREATE UNIQUE INDEX "IntegrationSetting_type_key" ON "IntegrationSetting"("type");

-- Один маппинг Jira на тип продукта
ALTER TABLE "JiraMapping" ALTER COLUMN "ddProductTypeId" SET NOT NULL;
CREATE UNIQUE INDEX "JiraMapping_ddProductTypeId_key" ON "JiraMapping"("ddProductTypeId");

-- Один маппинг Dependency-Track на продукт
ALTER TABLE "DependencyTrackMapping" ALTER COLUMN "ddProductId" SET NOT NULL;
CREATE UNIQUE INDEX "DependencyTrackMapping_ddProductId_key" ON "DependencyTrackMapping"("ddProductId");

-- Log: append-only журнал, updatedAt не нужен; индекс для сортировки по времени
ALTER TABLE "Log" DROP COLUMN "updatedAt";
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");
