import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import schoolsData from '@/data.json';

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
    const { lgaCode, schoolCode, password } = await req.json();

    // Validate input
    if (!lgaCode || !schoolCode || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate against data.json
    const schools = schoolsData as SchoolData[];
    const schoolData = schools.find(
      (s) => s.lCode === lgaCode && s.schCode === schoolCode
    );

    if (!schoolData) {
      return NextResponse.json(
        { error: 'Invalid LGA code or school code. Please check your credentials.' },
        { status: 404 }
      );
    }

    // Check if school is registered in database
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
        { error: 'School not registered. Please sign up first.' },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, school.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        schoolId: school.id,
        lgaCode: school.lgaCode,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'Login successful',
        token,
        school: {
          id: school.id,
          lgaCode: school.lgaCode,
          schoolCode: school.schoolCode,
          schoolName: school.schoolName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
