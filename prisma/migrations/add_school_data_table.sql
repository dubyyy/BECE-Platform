-- Migration: Add SchoolData table to replace data.json file
-- This eliminates file-based storage and concurrent write issues

-- Create SchoolData table
CREATE TABLE IF NOT EXISTS "SchoolData" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lgaCode" TEXT NOT NULL,
  "lCode" TEXT NOT NULL,
  "schCode" TEXT NOT NULL,
  "progID" TEXT NOT NULL,
  "schName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS "SchoolData_lgaCode_idx" ON "SchoolData"("lgaCode");
CREATE INDEX IF NOT EXISTS "SchoolData_schCode_idx" ON "SchoolData"("schCode");
CREATE INDEX IF NOT EXISTS "SchoolData_lCode_idx" ON "SchoolData"("lCode");
CREATE INDEX IF NOT EXISTS "SchoolData_schName_idx" ON "SchoolData"("schName");

-- Create composite index for common queries
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolData_lgaCode_schCode_key" 
  ON "SchoolData"("lgaCode", "schCode");

-- Add indexes to existing tables for better performance
CREATE INDEX IF NOT EXISTS "School_lgaCode_idx" ON "School"("lgaCode");
CREATE INDEX IF NOT EXISTS "School_schoolCode_idx" ON "School"("schoolCode");
CREATE INDEX IF NOT EXISTS "StudentRegistration_schoolId_idx" ON "StudentRegistration"("schoolId");
CREATE INDEX IF NOT EXISTS "StudentRegistration_studentNumber_idx" ON "StudentRegistration"("studentNumber");
CREATE INDEX IF NOT EXISTS "AccessPin_pin_idx" ON "AccessPin"("pin");
CREATE INDEX IF NOT EXISTS "AccessPin_isActive_idx" ON "AccessPin"("isActive");

-- Comment explaining the migration
COMMENT ON TABLE "SchoolData" IS 'Replaces data.json file - contains master list of all schools in the system';
