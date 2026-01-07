import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessPin } from '@/lib/generate-pin';

export async function POST(req: NextRequest) {
  try {
    const { count } = await req.json();

    if (!count || count < 1 || count > 1000) {
      return NextResponse.json(
        { error: 'Please specify a count between 1 and 1000' },
        { status: 400 }
      );
    }

    const generatedPins = [];
    const failedCount = 0;

    // Generate the requested number of PINs
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let pinCreated = false;

      while (!pinCreated && attempts < 10) {
        try {
          const newPin = generateAccessPin();
          
          // Try to create the PIN (will fail if duplicate)
          const createdPin = await prisma.accessPin.create({
            data: { pin: newPin },
          });
          
          generatedPins.push(createdPin);
          pinCreated = true;
        } catch (error: any) {
          // If duplicate, try again with a new PIN
          if (error.code === 'P2002') {
            attempts++;
          } else {
            throw error;
          }
        }
      }
    }

    return NextResponse.json(
      {
        message: `Successfully generated ${generatedPins.length} access PIN(s)`,
        count: generatedPins.length,
        pins: generatedPins.map(p => ({
          id: p.id,
          pin: p.pin,
          createdAt: p.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PIN generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate access PINs' },
      { status: 500 }
    );
  }
}
