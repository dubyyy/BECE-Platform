import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "data.json");

interface SchoolEntry {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

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
    const validSchools: SchoolEntry[] = [];
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
        id: "", // Will be assigned below
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

    // Read current data
    let existingSchools: SchoolEntry[] = [];
    try {
      const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
      existingSchools = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist or is empty, start with empty array
      console.log("Creating new data.json file");
      existingSchools = [];
    }

    // Generate IDs for new schools
    let lastId = existingSchools.length > 0 
      ? parseInt(existingSchools[existingSchools.length - 1].id) 
      : 0;

    validSchools.forEach((school) => {
      lastId++;
      school.id = lastId.toString();
    });

    // Merge and write
    const updatedSchools = [...existingSchools, ...validSchools];

    await fs.writeFile(
      DATA_FILE_PATH,
      JSON.stringify(updatedSchools),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      count: validSchools.length,
      total: updatedSchools.length,
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
