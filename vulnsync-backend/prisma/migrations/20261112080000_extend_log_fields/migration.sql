-- Расширение журнала событий кибербезопасности:
-- источник, описание, учётная запись, Source/Destination IP.
-- Время события хранится в createdAt.
ALTER TABLE "Log"
  ADD COLUMN "service" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "username" TEXT,
  ADD COLUMN "destinationIp" TEXT;

CREATE INDEX "Log_action_idx" ON "Log"("action");
CREATE INDEX "Log_username_idx" ON "Log"("username");
