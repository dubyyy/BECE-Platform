/*
  Warnings:

  - The primary key for the `Result` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `candidateName` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `crsGrade` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `englishGrade` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `examinationNumber` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `generalPaperGrade` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `lga` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `lgaExamNumber` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `mathGrade` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `pinCode` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `school` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `sex` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Result` table. All the data in the column will be lost.
  - The `id` column on the `Result` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[examinationNo]` on the table `Result` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accessPin` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `examinationNo` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fName` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionCd` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lName` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lgaCd` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolName` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionYr` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sexCd` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_userId_fkey";

-- DropIndex
DROP INDEX "Result_examinationNumber_key";

-- AlterTable
ALTER TABLE "Result" DROP CONSTRAINT "Result_pkey",
DROP COLUMN "candidateName",
DROP COLUMN "createdAt",
DROP COLUMN "crsGrade",
DROP COLUMN "englishGrade",
DROP COLUMN "examinationNumber",
DROP COLUMN "generalPaperGrade",
DROP COLUMN "lga",
DROP COLUMN "lgaExamNumber",
DROP COLUMN "mathGrade",
DROP COLUMN "pinCode",
DROP COLUMN "school",
DROP COLUMN "serialNumber",
DROP COLUMN "sex",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
DROP COLUMN "year",
ADD COLUMN     "accessPin" TEXT NOT NULL,
ADD COLUMN     "arit" DOUBLE PRECISION,
ADD COLUMN     "aritGrd" TEXT,
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "eng" DOUBLE PRECISION,
ADD COLUMN     "engGrd" TEXT,
ADD COLUMN     "examinationNo" TEXT NOT NULL,
ADD COLUMN     "fName" TEXT NOT NULL,
ADD COLUMN     "gp" DOUBLE PRECISION,
ADD COLUMN     "gpGrd" TEXT,
ADD COLUMN     "institutionCd" TEXT NOT NULL,
ADD COLUMN     "lName" TEXT NOT NULL,
ADD COLUMN     "lgaCd" TEXT NOT NULL,
ADD COLUMN     "mName" TEXT,
ADD COLUMN     "rgs" DOUBLE PRECISION,
ADD COLUMN     "rgsGrd" TEXT,
ADD COLUMN     "rgstype" TEXT,
ADD COLUMN     "schoolName" TEXT NOT NULL,
ADD COLUMN     "sessionYr" TEXT NOT NULL,
ADD COLUMN     "sexCd" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Result_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "religiousClassification" TEXT;

-- AlterTable
ALTER TABLE "SchoolData" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudentRegistration" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PostRegistration" (
    "id" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "othername" TEXT,
    "lastname" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT NOT NULL,
    "schoolType" TEXT NOT NULL,
    "passport" TEXT,
    "englishTerm1" TEXT,
    "englishTerm2" TEXT,
    "englishTerm3" TEXT,
    "arithmeticTerm1" TEXT,
    "arithmeticTerm2" TEXT,
    "arithmeticTerm3" TEXT,
    "generalTerm1" TEXT,
    "generalTerm2" TEXT,
    "generalTerm3" TEXT,
    "religiousType" TEXT,
    "religiousTerm1" TEXT,
    "religiousTerm2" TEXT,
    "religiousTerm3" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accCode" TEXT NOT NULL,
    "lateRegistration" BOOLEAN NOT NULL DEFAULT false,
    "prcd" INTEGER NOT NULL DEFAULT 1,
    "year" TEXT NOT NULL DEFAULT '2025/2026',

    CONSTRAINT "PostRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostRegistration_studentNumber_key" ON "PostRegistration"("studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PostRegistration_accCode_key" ON "PostRegistration"("accCode");

-- CreateIndex
CREATE INDEX "PostRegistration_schoolId_idx" ON "PostRegistration"("schoolId");

-- CreateIndex
CREATE INDEX "PostRegistration_studentNumber_idx" ON "PostRegistration"("studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Result_examinationNo_key" ON "Result"("examinationNo");

-- AddForeignKey
ALTER TABLE "PostRegistration" ADD CONSTRAINT "PostRegistration_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
