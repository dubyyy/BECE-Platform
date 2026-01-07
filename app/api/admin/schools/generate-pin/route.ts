import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessPin } from '@/lib/generate-pin';

export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json();

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Generate new PIN
    const newPin = generateAccessPin();

    // Update school with new PIN
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { accessPin: newPin },
    });

    return NextResponse.json(
      {
        message: 'Access PIN generated successfully',
        schoolId: updatedSchool.id,
        accessPin: newPin,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PIN generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate access PIN' },
      { status: 500 }
    );
  }
}
