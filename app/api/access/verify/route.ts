import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import schoolsData from '@/data.json';

const GLOBAL_RESULTS_RELEASE_KEY = '__GLOBAL_RESULTS_RELEASE__';

interface SchoolData {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

export async function POST(req: NextRequest) {
  try {
    const { lgaCode, schoolCode, accessPin } = await req.json();

    // Validate input
    if (!lgaCode || !schoolCode || !accessPin) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate against data.json
    const schools = schoolsData as SchoolData[];
    const schoolData = schools.find(
      (s) => s.lgaCode === lgaCode && s.schCode === schoolCode
    );

    if (!schoolData) {
      return NextResponse.json(
        { error: 'Invalid LGA code or school code. Please check your credentials.' },
        { status: 404 }
      );
    }

    // Verify the access PIN against the PIN pool
    const validPin = await prisma.accessPin.findFirst({
      where: {
        pin: accessPin,
        isActive: true,
      },
    });

    if (accessPin === GLOBAL_RESULTS_RELEASE_KEY) {
      return NextResponse.json(
        { error: 'Invalid or inactive access PIN. Please check your PIN and try again.' },
        { status: 401 }
      );
    }

    if (!validPin) {
      return NextResponse.json(
        { error: 'Invalid or inactive access PIN. Please check your PIN and try again.' },
        { status: 401 }
      );
    }

    // Check if PIN is already claimed by another school
    if (validPin.ownerLgaCode && validPin.ownerSchoolCode) {
      // PIN is claimed - verify it belongs to this school
      if (validPin.ownerLgaCode !== lgaCode || validPin.ownerSchoolCode !== schoolCode) {
        return NextResponse.json(
          { error: 'This PIN is already registered to another school. Please use a different PIN or contact the administrator.' },
          { status: 403 }
        );
      }
      // PIN belongs to this school - increment usage count
      await prisma.accessPin.update({
        where: { id: validPin.id },
        data: { usageCount: { increment: 1 } },
      });
    } else {
      // PIN is unclaimed - claim it for this school
      await prisma.accessPin.update({
        where: { id: validPin.id },
        data: {
          ownerLgaCode: lgaCode,
          ownerSchoolCode: schoolCode,
          ownerSchoolName: schoolData.schName,
          claimedAt: new Date(),
          usageCount: 1,
        },
      });
    }

    // Check if school exists in database (optional - for registration tracking)
    const school = await prisma.school.findFirst({
      where: {
        lgaCode,
        schoolCode,
      },
    });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        schoolId: school?.id,
        lgaCode,
        schoolCode,
        schoolName: schoolData.schName,
        isRegistered: !!school,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'Access granted',
        token,
        school: {
          id: school?.id,
          lgaCode,
          schoolCode,
          schoolName: schoolData.schName,
          isRegistered: !!school,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Access verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
