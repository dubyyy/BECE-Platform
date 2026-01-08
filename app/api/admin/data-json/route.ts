import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Read schools with pagination and search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const getAll = searchParams.get("all") === "true";
    const lgaCodeFilter = searchParams.get("lgaCode") || "";
    const schCodeFilter = searchParams.get("schCode") || "";

    // Build where clause for search and filters
    const whereConditions: Record<string, unknown>[] = [];

    // Add LGA code filter if provided
    if (lgaCodeFilter) {
      whereConditions.push({ lgaCode: lgaCodeFilter });
    }

    // Add school code filter if provided
    if (schCodeFilter) {
      whereConditions.push({ schCode: schCodeFilter });
    }

    // Add search filter if provided
    if (search) {
      whereConditions.push({
        OR: [
          { schName: { contains: search, mode: "insensitive" as const } },
          { lgaCode: { contains: search, mode: "insensitive" as const } },
          { schCode: { contains: search, mode: "insensitive" as const } },
          { id: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }

    const whereClause = whereConditions.length > 0
      ? { AND: whereConditions }
      : {};

    // Get total count
    const total = await prisma.schoolData.count({ where: whereClause });

    // Get schools with pagination
    const schools = await prisma.schoolData.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
      ...(getAll ? {} : { skip: (page - 1) * limit, take: limit }),
    });

    // Transform to match expected format
    const data = schools.map((s) => ({
      id: s.id,
      lgaCode: s.lgaCode,
      lCode: s.lCode,
      schCode: s.schCode,
      progID: s.progID,
      schName: s.schName,
    }));

    return NextResponse.json({
      data,
      total,
      page: getAll ? 1 : page,
      limit: getAll ? total : limit,
      totalPages: getAll ? 1 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error reading SchoolData:", error);
    return NextResponse.json(
      { error: "Failed to read school data" },
      { status: 500 }
    );
  }
}

// POST - Add a new school
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lgaCode, lCode, schCode, progID, schName } = body;

    if (!lgaCode || !schCode || !progID || !schName) {
      return NextResponse.json(
        { error: "Missing required fields: lgaCode, schCode, progID, schName" },
        { status: 400 }
      );
    }

    // Check if school already exists
    const existing = await prisma.schoolData.findUnique({
      where: { lgaCode_schCode: { lgaCode, schCode } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "School with this lgaCode and schCode already exists" },
        { status: 409 }
      );
    }

    // Create new school
    const newSchool = await prisma.schoolData.create({
      data: {
        lgaCode,
        lCode: lCode || "NULL",
        schCode,
        progID,
        schName,
      },
    });

    return NextResponse.json(
      {
        id: newSchool.id,
        lgaCode: newSchool.lgaCode,
        lCode: newSchool.lCode,
        schCode: newSchool.schCode,
        progID: newSchool.progID,
        schName: newSchool.schName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding school:", error);
    return NextResponse.json(
      { error: "Failed to add school" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing school
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, lgaCode, lCode, schCode, progID, schName } = body;

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Check if school exists
    const existing = await prisma.schoolData.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Update the school
    const updatedSchool = await prisma.schoolData.update({
      where: { id },
      data: {
        ...(lgaCode && { lgaCode }),
        ...(lCode !== undefined && { lCode }),
        ...(schCode && { schCode }),
        ...(progID && { progID }),
        ...(schName && { schName }),
      },
    });

    return NextResponse.json({
      id: updatedSchool.id,
      lgaCode: updatedSchool.lgaCode,
      lCode: updatedSchool.lCode,
      schCode: updatedSchool.schCode,
      progID: updatedSchool.progID,
      schName: updatedSchool.schName,
    });
  } catch (error) {
    console.error("Error updating school:", error);
    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a school
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Check if school exists
    const existing = await prisma.schoolData.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Delete the school
    await prisma.schoolData.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
