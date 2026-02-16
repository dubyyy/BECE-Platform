import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get current registration status for all schools or specific school
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (schoolId) {
      // Get specific school status
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, schoolName: true, registrationOpen: true },
      });

      if (!school) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(school);
    }

    // Get all schools with their registration status
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        lgaCode: true,
        schoolCode: true,
        schoolName: true,
        registrationOpen: true,
      },
      orderBy: [
        { lgaCode: 'asc' },
        { schoolCode: 'asc' },
      ],
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration status' },
      { status: 500 }
    );
  }
}

// POST - Toggle registration status for a specific school or all schools
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, registrationOpen, toggleAll } = body;

    if (toggleAll === true) {
      // Toggle all schools to the same status
      if (typeof registrationOpen !== 'boolean') {
        return NextResponse.json(
          { error: 'registrationOpen must be a boolean when toggleAll is true' },
          { status: 400 }
        );
      }

      await prisma.school.updateMany({
        data: { registrationOpen },
      });

      return NextResponse.json({
        message: `Registration ${registrationOpen ? 'opened' : 'closed'} for all schools`,
        registrationOpen,
      });
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required when toggleAll is not true' },
        { status: 400 }
      );
    }

    // Toggle or set specific school
    if (typeof registrationOpen === 'boolean') {
      // Set to specific value
      const school = await prisma.school.update({
        where: { id: schoolId },
        data: { registrationOpen },
        select: { id: true, schoolName: true, registrationOpen: true },
      });

      return NextResponse.json({
        message: `Registration ${registrationOpen ? 'opened' : 'closed'} for ${school.schoolName}`,
        school,
      });
    } else {
      // Toggle current value
      const currentSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { registrationOpen: true, schoolName: true },
      });

      if (!currentSchool) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }

      const school = await prisma.school.update({
        where: { id: schoolId },
        data: { registrationOpen: !currentSchool.registrationOpen },
        select: { id: true, schoolName: true, registrationOpen: true },
      });

      return NextResponse.json({
        message: `Registration ${school.registrationOpen ? 'opened' : 'closed'} for ${school.schoolName}`,
        school,
      });
    }
  } catch (error) {
    console.error('Error toggling registration:', error);
    return NextResponse.json(
      { error: 'Failed to toggle registration status' },
      { status: 500 }
    );
  }
}
