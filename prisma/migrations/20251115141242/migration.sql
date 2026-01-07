-- CreateTable
CREATE TABLE "StudentRegistration" (
    "id" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "othername" TEXT,
    "lastname" TEXT NOT NULL,
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

    CONSTRAINT "StudentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentRegistration_studentNumber_key" ON "StudentRegistration"("studentNumber");

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
