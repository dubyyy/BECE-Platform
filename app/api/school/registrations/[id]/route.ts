import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface JwtPayload {
  schoolId: string;
  lgaCode: string;
  schoolCode: string;
  schoolName: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: studentId } = await params;
    
    // Verify the student exists and belongs to this school
    const existingStudent = await prisma.studentRegistration.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (existingStudent.schoolId !== decoded.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized. You can only edit students from your school.' },
        { status: 403 }
      );
    }

    // Get updated data from request body
    const updateData = await req.json();

    console.log('Updating student ID:', studentId);
    console.log('Update data received:', updateData);

    const data: Prisma.StudentRegistrationUpdateInput = {};

    if (typeof updateData.firstname === 'string') data.firstname = updateData.firstname;
    if (typeof updateData.othername === 'string' || updateData.othername === null) data.othername = updateData.othername;
    if (typeof updateData.lastname === 'string') data.lastname = updateData.lastname;
    if (typeof updateData.gender === 'string') data.gender = updateData.gender;
    if (typeof updateData.schoolType === 'string') data.schoolType = updateData.schoolType;

    if (typeof updateData.passport === 'string' || updateData.passport === null) data.passport = updateData.passport;

    if (typeof updateData.dateOfBirth === 'string') {
      data.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    } else if (updateData.dateOfBirth === null) {
      data.dateOfBirth = null;
    }

    if (typeof updateData.englishTerm1 === 'string' || updateData.englishTerm1 === null) data.englishTerm1 = updateData.englishTerm1;
    if (typeof updateData.englishTerm2 === 'string' || updateData.englishTerm2 === null) data.englishTerm2 = updateData.englishTerm2;
    if (typeof updateData.englishTerm3 === 'string' || updateData.englishTerm3 === null) data.englishTerm3 = updateData.englishTerm3;

    if (typeof updateData.arithmeticTerm1 === 'string' || updateData.arithmeticTerm1 === null) data.arithmeticTerm1 = updateData.arithmeticTerm1;
    if (typeof updateData.arithmeticTerm2 === 'string' || updateData.arithmeticTerm2 === null) data.arithmeticTerm2 = updateData.arithmeticTerm2;
    if (typeof updateData.arithmeticTerm3 === 'string' || updateData.arithmeticTerm3 === null) data.arithmeticTerm3 = updateData.arithmeticTerm3;

    if (typeof updateData.generalTerm1 === 'string' || updateData.generalTerm1 === null) data.generalTerm1 = updateData.generalTerm1;
    if (typeof updateData.generalTerm2 === 'string' || updateData.generalTerm2 === null) data.generalTerm2 = updateData.generalTerm2;
    if (typeof updateData.generalTerm3 === 'string' || updateData.generalTerm3 === null) data.generalTerm3 = updateData.generalTerm3;

    if (typeof updateData.religiousType === 'string' || updateData.religiousType === null) data.religiousType = updateData.religiousType;
    if (typeof updateData.religiousTerm1 === 'string' || updateData.religiousTerm1 === null) data.religiousTerm1 = updateData.religiousTerm1;
    if (typeof updateData.religiousTerm2 === 'string' || updateData.religiousTerm2 === null) data.religiousTerm2 = updateData.religiousTerm2;
    if (typeof updateData.religiousTerm3 === 'string' || updateData.religiousTerm3 === null) data.religiousTerm3 = updateData.religiousTerm3;

    if (typeof updateData.year === 'string') data.year = updateData.year;
    if (typeof updateData.prcd === 'number') data.prcd = updateData.prcd;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided to update.' },
        { status: 400 }
      );
    }

    // Update the student record
    const updatedStudent = await prisma.studentRegistration.update({
      where: { id: studentId },
      data,
    });

    console.log('Student updated successfully:', updatedStudent.id);

    return NextResponse.json(
      {
        message: 'Student updated successfully',
        student: updatedStudent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Student update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Failed to update student. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    const { id: studentId } = await params;
    
    // Verify the student exists and belongs to this school
    const existingStudent = await prisma.studentRegistration.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (existingStudent.schoolId !== decoded.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized. You can only delete students from your school.' },
        { status: 403 }
      );
    }

    // Delete the student record
    await prisma.studentRegistration.delete({
      where: { id: studentId },
    });

    return NextResponse.json(
      { message: 'Student deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Student delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete student. Please try again.' },
      { status: 500 }
    );
  }
}
