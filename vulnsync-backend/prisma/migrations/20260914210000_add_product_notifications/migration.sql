-- CreateTable
CREATE TABLE "ProductTypeNotification" (
    "id" TEXT NOT NULL,
    "ddProductTypeId" INTEGER NOT NULL,
    "emails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTypeNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductTypeNotification_ddProductTypeId_key" ON "ProductTypeNotification"("ddProductTypeId");
