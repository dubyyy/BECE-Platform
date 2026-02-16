import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessPin } from '@/lib/generate-pin';

export async function POST(req: NextRequest) {
  try {
    // Find all schools without an access PIN
    const schoolsWithoutPin = await prisma.school.findMany({
      where: {
        OR: [
          { accessPin: null },
          { accessPin: '' },
        ],
      },
      select: { id: true }, // Only select ID for efficiency
    });

    if (schoolsWithoutPin.length === 0) {
      return NextResponse.json(
        { message: 'All schools already have access PINs', count: 0 },
        { status: 200 }
      );
    }

    // Pre-generate all PINs (fast, no DB calls)
    const schoolPinMap = schoolsWithoutPin.map(school => ({
      id: school.id,
      pin: generateAccessPin(),
    }));

    // Batch update using transaction for better performance
    // Process in chunks to avoid hitting query size limits
    const CHUNK_SIZE = 100;
    let totalUpdated = 0;

    for (let i = 0; i < schoolPinMap.length; i += CHUNK_SIZE) {
      const chunk = schoolPinMap.slice(i, i + CHUNK_SIZE);
      
      await prisma.$transaction(
        chunk.map(({ id, pin }) =>
          prisma.school.update({
            where: { id },
            data: { accessPin: pin },
          })
        )
      );
      
      totalUpdated += chunk.length;
    }

    return NextResponse.json(
      {
        message: `Access PINs generated successfully for ${totalUpdated} school(s)`,
        count: totalUpdated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bulk PIN generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate access PINs' },
      { status: 500 }
    );
  }
}
