import { NextResponse } from "next/server";
import { generateToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { lgaCode, icode } = await request.json();

    if (!lgaCode || !icode) {
      return NextResponse.json(
        { error: "LGA and icode are required" },
        { status: 400 }
      );
    }

    // Find a school entry in SchoolData that matches both lgaCode and lCode (icode)
    const schoolData = await prisma.schoolData.findFirst({
      where: {
        lgaCode: lgaCode,
        lCode: icode,
      },
    });

    if (!schoolData) {
      return NextResponse.json(
        { error: "Invalid LGA or icode" },
        { status: 401 }
      );
    }

    // Generate JWT token with CIE information
    const token = generateToken({
      schoolId: schoolData.id,
      lgaCode: schoolData.lgaCode,
      schoolCode: schoolData.schCode,
      schoolName: schoolData.schName,
    });

    return NextResponse.json({
      success: true,
      token,
      school: {
        id: schoolData.id,
        lgaCode: schoolData.lgaCode,
        schoolCode: schoolData.schCode,
        schoolName: schoolData.schName,
      },
    });
  } catch (error) {
    console.error("CIE auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
