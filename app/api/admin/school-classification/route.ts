import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/admin/school-classification
 * Body: { schoolId: string, classification: 'Christian' | 'Muslim' | null }
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const body = await req.json();
    const { schoolId, schoolCode, classification } = body;

    if (!schoolId && !schoolCode) {
      return NextResponse.json(
        { error: "schoolId or schoolCode is required" },
        { status: 400 }
      );
    }

    // Validate classification value
    if (classification !== null && classification !== 'Christian' && classification !== 'Muslim') {
      return NextResponse.json(
        { error: "classification must be 'Christian', 'Muslim', or null" },
        { status: 400 }
      );
    }

    // Find and update school religious classification
    let school;
    if (schoolId) {
      school = await prisma.school.update({
        where: { id: schoolId },
        data: { religiousClassification: classification },
      });
    } else {
      // Find by school code
      const existingSchool = await prisma.school.findFirst({
        where: { schoolCode: schoolCode },
      });

      if (!existingSchool) {
        return NextResponse.json(
          { error: `School with code ${schoolCode} not found` },
          { status: 404 }
        );
      }

      school = await prisma.school.update({
        where: { id: existingSchool.id },
        data: { religiousClassification: classification },
      });
    }

    return NextResponse.json({
      success: true,
      message: `School ${school.schoolName} classification updated to ${classification || 'None'}`,
      school: {
        id: school.id,
        name: school.schoolName,
        code: school.schoolCode,
        religiousClassification: school.religiousClassification,
      },
    });
  } catch (error) {
    console.error("Error updating school classification:", error);
    return NextResponse.json(
      { 
        error: "Failed to update school classification",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/school-classification?schoolId=<id>
 * Get school classification
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.READ);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId is required" },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        schoolName: true,
        religiousClassification: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school classification:", error);
    return NextResponse.json(
      { error: "Failed to fetch school classification" },
      { status: 500 }
    );
  }
}
