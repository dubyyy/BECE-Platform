/*
  Warnings:

  - A unique constraint covering the columns `[accCode]` on the table `StudentRegistration` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable: Add column as nullable first
ALTER TABLE "StudentRegistration" ADD COLUMN "accCode" TEXT;

-- Update existing rows with unique generated values using gen_random_uuid()
UPDATE "StudentRegistration" SET "accCode" = gen_random_uuid()::text WHERE "accCode" IS NULL;

-- Make the column NOT NULL with default for future inserts
ALTER TABLE "StudentRegistration" ALTER COLUMN "accCode" SET NOT NULL;
ALTER TABLE "StudentRegistration" ALTER COLUMN "accCode" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "StudentRegistration_accCode_key" ON "StudentRegistration"("accCode");
