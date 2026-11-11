-- Группы продуктов DefectDojo, доступные пользователю с ролью USER.
-- ADMIN и VIEWER не ограничиваются этим списком.
ALTER TABLE "User"
ADD COLUMN "allowedProductTypeIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
