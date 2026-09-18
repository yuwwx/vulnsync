-- Очередь отправки отчётов (отложенный запуск engagement-отчётов,
-- фундамент для еженедельных отчётов по продуктам)

CREATE TABLE IF NOT EXISTS "ReportQueueItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReportQueueItem_type_externalId_key" ON "ReportQueueItem"("type", "externalId");

CREATE INDEX IF NOT EXISTS "ReportQueueItem_runAt_idx" ON "ReportQueueItem"("runAt");
