import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/count
 * Query params: type=lga | schools-by-lga&lga=<lgaCode>
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const lgaCode = searchParams.get('lga');

    if (type === 'lga') {
      // Count total number of unique LGAs
      const uniqueLGAs = await prisma.school.findMany({
        distinct: ['lgaCode'],
        select: {
          lgaCode: true,
        },
      });

      return NextResponse.json({
        count: uniqueLGAs.length,
        lgas: uniqueLGAs.map(l => l.lgaCode),
      });
    }

    if (type === 'schools-by-lga' && lgaCode) {
      // Count schools in a specific LGA
      const count = await prisma.school.count({
        where: {
          lgaCode: lgaCode,
        },
      });

      return NextResponse.json({
        lgaCode,
        count,
      });
    }

    if (type === 'all-schools-by-lga') {
      // Get count of schools for each LGA
      const schools = await prisma.school.findMany({
        select: {
          lgaCode: true,
        },
      });

      const lgaCounts = schools.reduce((acc: Record<string, number>, school) => {
        acc[school.lgaCode] = (acc[school.lgaCode] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json(
        Object.entries(lgaCounts).map(([lgaCode, count]) => ({
          lgaCode,
          count,
        }))
      );
    }

    return NextResponse.json(
      { error: "Invalid type parameter. Use 'lga', 'schools-by-lga', or 'all-schools-by-lga'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in count API:", error);
    return NextResponse.json(
      { error: "Failed to fetch count data" },
      { status: 500 }
    );
  }
}
