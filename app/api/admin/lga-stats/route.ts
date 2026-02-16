import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLGAName } from "@/lib/lga-mapping";
import { cache, CACHE_TTL } from "@/lib/cache";

const LGA_STATS_CACHE_KEY = 'admin:lga-stats';

export async function GET(req: NextRequest) {
  try {
    // Check cache first (5 minute TTL)
    const cached = cache.get(LGA_STATS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get all schools with their student counts
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            studentRegistrations: true,
          },
        },
      },
    });
    
    // Group by LGA
    const lgaStats = schools.reduce<Record<string, { lga: string; students: number; schools: number }>>((acc, school) => {
      const lgaCode = school.lgaCode;
      const lgaName = getLGAName(lgaCode);
      
      if (!acc[lgaCode]) {
        acc[lgaCode] = {
          lga: lgaName,  // Use the full name instead of code
          students: 0,
          schools: 0,
        };
      }
      
      acc[lgaCode].students += school._count.studentRegistrations;
      acc[lgaCode].schools += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by student count
    const lgaArray = Object.values(lgaStats).sort((a, b) => 
      b.students - a.students
    );

    // Cache for 5 minutes
    cache.set(LGA_STATS_CACHE_KEY, lgaArray, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(lgaArray);
  } catch (error) {
    console.error("Error fetching LGA stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch LGA statistics" },
      { status: 500 }
    );
  }
}
