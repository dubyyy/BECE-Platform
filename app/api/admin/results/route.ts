import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET - Fetch all results with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sessionYr = searchParams.get('sessionYr') || '';
    const lgaCode = searchParams.get('lgaCode') || '';
    const institutionCd = searchParams.get('institutionCd') || '';
    const blocked = searchParams.get('blocked');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ResultWhereInput = {};

    if (search) {
      where.OR = [
        { examinationNo: { contains: search, mode: 'insensitive' } },
        { fName: { contains: search, mode: 'insensitive' } },
        { lName: { contains: search, mode: 'insensitive' } },
        { schoolName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sessionYr) {
      where.sessionYr = sessionYr;
    }

    if (lgaCode) {
      where.lgaCd = lgaCode;
    }

    if (institutionCd) {
      where.institutionCd = institutionCd;
    }

    if (blocked !== null && blocked !== undefined) {
      where.blocked = blocked === 'true';
    }

    // Fetch results with pagination
    const [results, totalCount] = await Promise.all([
      prisma.result.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      prisma.result.count({ where }),
    ]);

    // Get unique session years and LGA codes for filters
    const [sessionYears, lgaCodes] = await Promise.all([
      prisma.result.findMany({
        select: { sessionYr: true },
        distinct: ['sessionYr'],
        orderBy: { sessionYr: 'desc' },
      }),
      prisma.result.findMany({
        select: { lgaCd: true },
        distinct: ['lgaCd'],
        orderBy: { lgaCd: 'asc' },
      }),
    ]);

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        sessionYears: sessionYears.map(s => s.sessionYr),
        lgaCodes: lgaCodes.map(l => l.lgaCd),
      },
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

// PUT - Update a result
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    const result = await prisma.result.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Result updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating result:', error);
    return NextResponse.json(
      { error: 'Failed to update result' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a result
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const examinationNo = searchParams.get('examinationNo');

    if (!id && !examinationNo) {
      return NextResponse.json(
        { error: 'Result ID or Examination Number is required' },
        { status: 400 }
      );
    }

    const where = id 
      ? { id: parseInt(id) }
      : { examinationNo: examinationNo! };

    // First check if the result exists
    const existingResult = await prisma.result.findUnique({ where });

    if (!existingResult) {
      return NextResponse.json(
        { error: 'Result not found with the provided examination number' },
        { status: 404 }
      );
    }

    // Delete the result
    await prisma.result.delete({ where });

    return NextResponse.json({
      message: 'Result deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json(
      { error: 'Failed to delete result. Please try again.' },
      { status: 500 }
    );
  }
}
