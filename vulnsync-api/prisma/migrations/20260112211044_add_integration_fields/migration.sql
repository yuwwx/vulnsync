-- AlterTable
ALTER TABLE "IntegrationSetting" ADD COLUMN     "password" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "apiToken" DROP NOT NULL;
