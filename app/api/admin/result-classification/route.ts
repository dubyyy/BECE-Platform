import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST /api/admin/result-classification
 * Body: { examinationNo?: string, institutionCd?: string, lgaCd?: string, rgstype: 'IRS' | 'CRS' | null }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examinationNo, institutionCd, lgaCd, rgstype } = body;

    // Validate that at least one identifier is provided
    if (!examinationNo && !institutionCd && !lgaCd) {
      return NextResponse.json(
        { error: "examinationNo, institutionCd, or lgaCd is required" },
        { status: 400 }
      );
    }

    // Validate rgstype value
    if (rgstype !== null && rgstype !== 'IRS' && rgstype !== 'CRS') {
      return NextResponse.json(
        { error: "rgstype must be 'IRS' (Islamic), 'CRS' (Christian), or null" },
        { status: 400 }
      );
    }

    // Build where clause based on provided parameters
    const whereClause: Prisma.ResultWhereInput = {};
    if (examinationNo) {
      whereClause.examinationNo = examinationNo;
    }
    if (institutionCd) {
      whereClause.institutionCd = institutionCd;
    }
    if (lgaCd) {
      whereClause.lgaCd = lgaCd;
    }

    // Update results
    const updateResult = await prisma.result.updateMany({
      where: whereClause,
      data: { rgstype },
    });

    let message = `Updated ${updateResult.count} result(s) religious classification to ${rgstype || 'None'}`;
    
    if (examinationNo) {
      message = `Result for examination number ${examinationNo} updated to ${rgstype || 'None'}`;
    } else if (institutionCd && !lgaCd) {
      message = `${updateResult.count} result(s) for school ${institutionCd} updated to ${rgstype || 'None'}`;
    } else if (lgaCd && !institutionCd) {
      message = `${updateResult.count} result(s) for LGA ${lgaCd} updated to ${rgstype || 'None'}`;
    } else if (institutionCd && lgaCd) {
      message = `${updateResult.count} result(s) for school ${institutionCd} in LGA ${lgaCd} updated to ${rgstype || 'None'}`;
    }

    return NextResponse.json({
      success: true,
      message,
      count: updateResult.count,
    });
  } catch (error) {
    console.error("Error updating result classification:", error);
    return NextResponse.json(
      { 
        error: "Failed to update result classification",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/result-classification?examinationNo=<no>
 * Get result classification
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examinationNo = searchParams.get('examinationNo');

    if (!examinationNo) {
      return NextResponse.json(
        { error: "examinationNo is required" },
        { status: 400 }
      );
    }

    const result = await prisma.result.findUnique({
      where: { examinationNo },
      select: {
        examinationNo: true,
        fName: true,
        lName: true,
        rgstype: true,
        institutionCd: true,
        schoolName: true,
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching result classification:", error);
    return NextResponse.json(
      { error: "Failed to fetch result classification" },
      { status: 500 }
    );
  }
}
