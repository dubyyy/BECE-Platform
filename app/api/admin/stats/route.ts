import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cache, CACHE_TTL } from "@/lib/cache";

const STATS_CACHE_KEY = 'admin:stats';

export async function GET(req: NextRequest) {
  try {
    // Check cache first (1 minute TTL for dashboard stats)
    const cached = cache.get(STATS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get total students count
    const totalStudents = await prisma.studentRegistration.count();
    
    // Get total schools count
    const totalSchools = await prisma.school.count();
    
    // Get registrations today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const registrationsToday = await prisma.studentRegistration.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });
    
    // Get registrations yesterday for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const registrationsYesterday = await prisma.studentRegistration.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });
    
    // Get registrations last month for comparison
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const studentsLastMonth = await prisma.studentRegistration.count({
      where: {
        createdAt: {
          lt: lastMonth,
        },
      },
    });
    
    // Calculate trends
    const studentTrend = studentsLastMonth > 0 
      ? Math.round(((totalStudents - studentsLastMonth) / studentsLastMonth) * 100)
      : 0;
    
    const todayTrend = registrationsYesterday > 0
      ? Math.round(((registrationsToday - registrationsYesterday) / registrationsYesterday) * 100)
      : 0;

    const stats = {
      totalStudents,
      totalSchools,
      registrationsToday,
      studentTrend,
      todayTrend,
      registrationStatus: "Open", // This could be from a settings table
    };

    // Cache for 1 minute
    cache.set(STATS_CACHE_KEY, stats, CACHE_TTL.SHORT);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
