-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_lgaCode_schoolCode_key" ON "School"("lgaCode", "schoolCode");
