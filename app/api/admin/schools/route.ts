import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getLGAName } from "@/lib/lga-mapping";
import { generateAccessPin } from "@/lib/generate-pin";
import { cache, CACHE_TTL } from "@/lib/cache";

const SCHOOLS_CACHE_KEY = 'admin:schools';

export async function GET(req: NextRequest) {
  try {
    // Check cache first (5 minute TTL)
    const cached = cache.get(SCHOOLS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            studentRegistrations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Transform data for frontend
    const transformedSchools = schools.map(school => ({
      id: school.id,
      name: school.schoolName,
      code: school.schoolCode,
      lga: getLGAName(school.lgaCode),  // Convert code to full name
      lgaCode: school.lgaCode,
      studentCount: school._count.studentRegistrations,
      status: school.registrationOpen ? "Open" : "Closed",
      accessPin: school.accessPin,
      blocked: school.blocked,
      religiousClassification: school.religiousClassification,
      createdAt: school.createdAt,
    }));

    // Cache for 5 minutes
    cache.set(SCHOOLS_CACHE_KEY, transformedSchools, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(transformedSchools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, lga } = body;
    
    if (!name || !code || !lga) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Check if school code already exists
    const existing = await prisma.school.findUnique({
      where: {
        lgaCode_schoolCode: {
          lgaCode: lga,
          schoolCode: code,
        },
      },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "School code already exists in this LGA" },
        { status: 400 }
      );
    }
    
    // Generate default password (you may want to customize this)
    const defaultPassword = `${code.toLowerCase()}123`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Auto-generate access PIN for the new school
    const accessPin = generateAccessPin();
    
    const school = await prisma.school.create({
      data: {
        schoolName: name,
        schoolCode: code,
        lgaCode: lga,
        password: hashedPassword,
        accessPin: accessPin,
      },
    });
    
    // Invalidate schools cache
    cache.delete(SCHOOLS_CACHE_KEY);
    
    return NextResponse.json({
      id: school.id,
      name: school.schoolName,
      code: school.schoolCode,
      lga: getLGAName(school.lgaCode),
      lgaCode: school.lgaCode,
      studentCount: 0,
      status: "Open",
      accessPin: school.accessPin,
      blocked: school.blocked,
      religiousClassification: school.religiousClassification,
      createdAt: school.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }
    
    await prisma.school.delete({
      where: { id },
    });
    
    // Invalidate schools cache
    cache.delete(SCHOOLS_CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
