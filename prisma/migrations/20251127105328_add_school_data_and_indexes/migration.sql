-- CreateTable
CREATE TABLE "SchoolData" (
    "id" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "lCode" TEXT NOT NULL,
    "schCode" TEXT NOT NULL,
    "progID" TEXT NOT NULL,
    "schName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolData_lgaCode_idx" ON "SchoolData"("lgaCode");

-- CreateIndex
CREATE INDEX "SchoolData_schCode_idx" ON "SchoolData"("schCode");

-- CreateIndex
CREATE INDEX "SchoolData_lCode_idx" ON "SchoolData"("lCode");

-- CreateIndex
CREATE INDEX "SchoolData_schName_idx" ON "SchoolData"("schName");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolData_lgaCode_schCode_key" ON "SchoolData"("lgaCode", "schCode");

-- CreateIndex
CREATE INDEX "AccessPin_pin_idx" ON "AccessPin"("pin");

-- CreateIndex
CREATE INDEX "AccessPin_isActive_idx" ON "AccessPin"("isActive");

-- CreateIndex
CREATE INDEX "School_lgaCode_idx" ON "School"("lgaCode");

-- CreateIndex
CREATE INDEX "School_schoolCode_idx" ON "School"("schoolCode");

-- CreateIndex
CREATE INDEX "StudentRegistration_schoolId_idx" ON "StudentRegistration"("schoolId");

-- CreateIndex
CREATE INDEX "StudentRegistration_studentNumber_idx" ON "StudentRegistration"("studentNumber");
