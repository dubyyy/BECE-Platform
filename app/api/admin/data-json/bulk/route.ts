import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface BulkUploadRequest {
  schools: Array<{
    lgaCode?: string;
    lCode?: string;
    schCode?: string;
    progID?: string;
    schName?: string;
  }>;
}

// POST - Bulk add schools from CSV
export async function POST(request: Request) {
  try {
    const body: BulkUploadRequest = await request.json();
    const { schools } = body;

    if (!schools || !Array.isArray(schools) || schools.length === 0) {
      return NextResponse.json(
        { error: "Invalid data: schools array is required" },
        { status: 400 }
      );
    }

    // Validate and filter valid entries
    const validSchools: Array<{
      lgaCode: string;
      lCode: string;
      schCode: string;
      progID: string;
      schName: string;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!school.lgaCode || !school.schCode || !school.progID || !school.schName) {
        errors.push(`Row ${rowNum}: Missing required fields (lgaCode, schCode, progID, schName)`);
        continue;
      }

      validSchools.push({
        lgaCode: school.lgaCode.trim(),
        lCode: school.lCode?.trim() || "NULL",
        schCode: school.schCode.trim(),
        progID: school.progID.trim(),
        schName: school.schName.trim(),
      });
    }

    if (validSchools.length === 0) {
      return NextResponse.json(
        { 
          error: "No valid schools to add",
          details: errors
        },
        { status: 400 }
      );
    }

    // Use createMany with skipDuplicates to handle existing entries
    const result = await prisma.schoolData.createMany({
      data: validSchools,
      skipDuplicates: true,
    });

    // Get total count
    const total = await prisma.schoolData.count();

    return NextResponse.json({
      success: true,
      count: result.count,
      total,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 });

  } catch (error) {
    console.error("Error in bulk upload:", error);
    return NextResponse.json(
      { error: "Failed to process bulk upload" },
      { status: 500 }
    );
  }
}
