import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import schoolsData from '@/data.json';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

interface SchoolData {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.AUTH);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

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

    // Validate against data.json to ensure school exists
    const schools = schoolsData as SchoolData[];
    const school = schools.find(
      (s) => s.lCode === lgaCode && s.schCode === schoolCode
    );

    if (!school) {
      return NextResponse.json(
        { error: 'Invalid LGA code or school code. Please verify your school details.' },
        { status: 404 }
      );
    }

    // Check if school is already registered
    const existingSchool = await prisma.school.findUnique({
      where: {
        lgaCode_schoolCode: {
          lgaCode,
          schoolCode,
        },
      },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: 'This school is already registered. Please login instead.' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the school record
    const newSchool = await prisma.school.create({
      data: {
        lgaCode,
        schoolCode,
        schoolName: school.schName,
        password: hashedPassword,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        schoolId: newSchool.id,
        lgaCode: newSchool.lgaCode,
        schoolCode: newSchool.schoolCode,
        schoolName: newSchool.schoolName,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        message: 'School registered successfully',
        token,
        school: {
          id: newSchool.id,
          lgaCode: newSchool.lgaCode,
          schoolCode: newSchool.schoolCode,
          schoolName: newSchool.schoolName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
