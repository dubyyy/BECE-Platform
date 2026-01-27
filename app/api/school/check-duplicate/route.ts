import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  lgaCode: string;
}

interface StudentToCheck {
  firstname: string;
  lastname: string;
  othername?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Get and verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: JwtPayload;
    
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-this'
      ) as JwtPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    const { students } = await req.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No students to check' },
        { status: 400 }
      );
    }

    // Check for duplicates in StudentRegistration table
    const duplicatesFound: Array<{
      firstname: string;
      lastname: string;
      othername: string;
      studentNumber: string;
    }> = [];

    for (const student of students as StudentToCheck[]) {
      // Check in StudentRegistration
      const existingStudent = await prisma.studentRegistration.findFirst({
        where: {
          schoolId: decoded.schoolId,
          firstname: {
            equals: student.firstname,
            mode: 'insensitive',
          },
          lastname: {
            equals: student.lastname,
            mode: 'insensitive',
          },
          othername: student.othername ? {
            equals: student.othername,
            mode: 'insensitive',
          } : undefined,
        },
        select: {
          firstname: true,
          lastname: true,
          othername: true,
          studentNumber: true,
        },
      });

      if (existingStudent) {
        duplicatesFound.push({
          firstname: existingStudent.firstname,
          lastname: existingStudent.lastname,
          othername: existingStudent.othername || '',
          studentNumber: existingStudent.studentNumber,
        });
      } else {
        // Also check in PostRegistration table
        const existingPostStudent = await prisma.postRegistration.findFirst({
          where: {
            schoolId: decoded.schoolId,
            firstname: {
              equals: student.firstname,
              mode: 'insensitive',
            },
            lastname: {
              equals: student.lastname,
              mode: 'insensitive',
            },
            othername: student.othername ? {
              equals: student.othername,
              mode: 'insensitive',
            } : undefined,
          },
          select: {
            firstname: true,
            lastname: true,
            othername: true,
            studentNumber: true,
          },
        });

        if (existingPostStudent) {
          duplicatesFound.push({
            firstname: existingPostStudent.firstname,
            lastname: existingPostStudent.lastname,
            othername: existingPostStudent.othername || '',
            studentNumber: existingPostStudent.studentNumber,
          });
        }
      }
    }

    if (duplicatesFound.length > 0) {
      return NextResponse.json(
        {
          hasDuplicates: true,
          duplicates: duplicatesFound,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasDuplicates: false,
        duplicates: [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates. Please try again.' },
      { status: 500 }
    );
  }
}
