import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/admin/block
 * Body: { type: 'school' | 'student' | 'lga', schoolCode?: string, examNumber?: string, lgaCode?: string, blocked: boolean }
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const body = await req.json();
    const { type, schoolCode, examNumber, lgaCode, blocked } = body;

    if (typeof blocked !== 'boolean') {
      return NextResponse.json(
        { error: "blocked must be a boolean value" },
        { status: 400 }
      );
    }

    if (type === 'school' && schoolCode) {
      // Block/unblock all results for a school by school code
      const resultsUpdated = await prisma.result.updateMany({
        where: { institutionCd: schoolCode },
        data: { blocked },
      });

      return NextResponse.json({
        success: true,
        message: `${blocked ? 'Blocked' : 'Unblocked'} ${resultsUpdated.count} result(s) for school ${schoolCode}`,
        details: {
          resultsUpdated: resultsUpdated.count,
        },
      });
    }

    if (type === 'student' && examNumber) {
      // Block/unblock student by examination number in Result model
      const result = await prisma.result.findUnique({
        where: { examinationNo: examNumber },
      });

      if (result) {
        const updated = await prisma.result.update({
          where: { examinationNo: examNumber },
          data: { blocked },
        });

        return NextResponse.json({
          success: true,
          message: `Student ${updated.fName} ${updated.lName} ${blocked ? 'blocked' : 'unblocked'} successfully`,
        });
      }

      return NextResponse.json(
        { error: `Student with exam number ${examNumber} not found in results` },
        { status: 404 }
      );
    }

    if (type === 'lga' && lgaCode) {
      // Block/unblock all results in an LGA
      const resultsUpdated = await prisma.result.updateMany({
        where: { lgaCd: lgaCode },
        data: { blocked },
      });

      return NextResponse.json({
        success: true,
        message: `${blocked ? 'Blocked' : 'Unblocked'} ${resultsUpdated.count} result(s) for LGA ${lgaCode}`,
        details: {
          resultsUpdated: resultsUpdated.count,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide correct type and required parameters." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in block API:", error);
    return NextResponse.json(
      { 
        error: "Failed to update block status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
