/*
  Warnings:

  - You are about to drop the column `ddProductTypeId` on the `DependencyTrackMapping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DependencyTrackMapping" DROP COLUMN "ddProductTypeId",
ADD COLUMN     "ddProductId" INTEGER;
