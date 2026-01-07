import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { lgaCode, schoolCode, newPassword } = await req.json();

    // Validate input
    if (!lgaCode || !schoolCode || !newPassword) {
      return NextResponse.json(
        { error: 'LGA code, school code, and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find the school by lgaCode and schoolCode
    const school = await prisma.school.findUnique({
      where: {
        lgaCode_schoolCode: {
          lgaCode,
          schoolCode,
        },
      },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'School not found with the provided LGA code and school code' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the school's password
    const updatedSchool = await prisma.school.update({
      where: {
        id: school.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: 'Password reset successfully',
        school: {
          id: updatedSchool.id,
          lgaCode: updatedSchool.lgaCode,
          schoolCode: updatedSchool.schoolCode,
          schoolName: updatedSchool.schoolName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
