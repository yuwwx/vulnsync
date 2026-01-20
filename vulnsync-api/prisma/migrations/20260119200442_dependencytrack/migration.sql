-- CreateTable
CREATE TABLE "DependencyTrackMapping" (
    "id" TEXT NOT NULL,
    "ddProductTypeId" INTEGER,
    "dtProjectName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DependencyTrackMapping_pkey" PRIMARY KEY ("id")
);
