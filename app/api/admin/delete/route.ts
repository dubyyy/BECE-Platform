import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * DELETE /api/admin/delete
 * Body: { type: 'school' | 'student' | 'lga', schoolCode?: string, examNumber?: string, lgaCode?: string }
 */
export async function DELETE(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const body = await req.json();
    const { type, schoolCode, examNumber, lgaCode } = body;

    if (type === 'school' && schoolCode) {
      // Delete all results for a school by school code
      const resultsDeleted = await prisma.result.deleteMany({
        where: { institutionCd: schoolCode },
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${resultsDeleted.count} result(s) for school ${schoolCode}`,
        details: {
          resultsDeleted: resultsDeleted.count,
        },
      });
    }

    if (type === 'student' && examNumber) {
      // Delete student by examination number
      // First check in Result model
      const result = await prisma.result.findUnique({
        where: { examinationNo: examNumber },
      });

      if (result) {
        await prisma.result.delete({
          where: { examinationNo: examNumber },
        });

        return NextResponse.json({
          success: true,
          message: `Student with exam number ${examNumber} deleted from results`,
        });
      }

      // Check in StudentRegistration
      const student = await prisma.studentRegistration.findFirst({
        where: { studentNumber: examNumber },
      });

      if (student) {
        await prisma.studentRegistration.delete({
          where: { id: student.id },
        });

        return NextResponse.json({
          success: true,
          message: `Student with exam number ${examNumber} deleted from registrations`,
        });
      }

      // Check in PostRegistration
      const postStudent = await prisma.postRegistration.findFirst({
        where: { studentNumber: examNumber },
      });

      if (postStudent) {
        await prisma.postRegistration.delete({
          where: { id: postStudent.id },
        });

        return NextResponse.json({
          success: true,
          message: `Student with exam number ${examNumber} deleted from post-registrations`,
        });
      }

      return NextResponse.json(
        { error: `Student with exam number ${examNumber} not found` },
        { status: 404 }
      );
    }

    if (type === 'lga' && lgaCode) {
      // Delete all schools and students in a specific LGA
      // First delete all schools (cascade will handle students)
      const schoolsDeleted = await prisma.school.deleteMany({
        where: { lgaCode },
      });

      // Also delete from SchoolData
      const schoolDataDeleted = await prisma.schoolData.deleteMany({
        where: { lgaCode },
      });

      // Delete results from that LGA
      const resultsDeleted = await prisma.result.deleteMany({
        where: { lgaCd: lgaCode },
      });

      return NextResponse.json({
        success: true,
        message: `LGA ${lgaCode} deleted successfully`,
        details: {
          schoolsDeleted: schoolsDeleted.count,
          schoolDataDeleted: schoolDataDeleted.count,
          resultsDeleted: resultsDeleted.count,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide correct type and required parameters." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in delete API:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
