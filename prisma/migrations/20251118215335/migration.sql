-- AlterTable
ALTER TABLE "School" ADD COLUMN     "registrationOpen" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "StudentRegistration" ADD COLUMN     "lateRegistration" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "accCode" DROP DEFAULT;
