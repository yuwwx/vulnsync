/*
  Warnings:

  - You are about to drop the column `issueType` on the `JiraMapping` table. All the data in the column will be lost.
  - You are about to drop the column `productType` on the `JiraMapping` table. All the data in the column will be lost.
  - You are about to drop the column `projectKey` on the `JiraMapping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JiraMapping" DROP COLUMN "issueType",
DROP COLUMN "productType",
DROP COLUMN "projectKey",
ADD COLUMN     "ddProductTypeId" INTEGER;
