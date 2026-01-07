-- AlterTable
ALTER TABLE "AccessPin" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "ownerLgaCode" TEXT,
ADD COLUMN     "ownerSchoolCode" TEXT,
ADD COLUMN     "ownerSchoolName" TEXT;
