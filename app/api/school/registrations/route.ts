import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateBatchAccCodes } from '@/lib/generate-acccode';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

interface JwtPayload {
  schoolId: string;
  lgaCode: string;
  schoolCode: string;
  schoolName: string;
}

export async function PATCH(req: NextRequest) {
  try {
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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, update } = body || {};
    if (!id || !update || typeof update !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request. Provide id and update payload.' },
        { status: 400 }
      );
    }

    // Map nested client fields to flat DB columns if provided
    const data: any = {};
    if (typeof update.firstname === 'string') data.firstname = update.firstname;
    if (typeof update.othername === 'string') data.othername = update.othername;
    if (typeof update.lastname === 'string') data.lastname = update.lastname;
    if (typeof update.gender === 'string') data.gender = update.gender;
    if (typeof update.schoolType === 'string') data.schoolType = update.schoolType;
    if (typeof update.passport === 'string' || update.passport === null) data.passport = update.passport;
    if (typeof update.dateOfBirth === 'string') data.dateOfBirth = update.dateOfBirth ? new Date(update.dateOfBirth) : null;
    
    // Handle dynamic CA scores and student subjects
    if (update.caScores && typeof update.caScores === 'object') {
      data.caScores = update.caScores as Prisma.InputJsonValue;
      // Also update legacy fields from caScores for backward compatibility
      if (update.caScores.ENG) {
        data.englishTerm1 = update.caScores.ENG.year1 || '-';
        data.englishTerm2 = update.caScores.ENG.year2 || '-';
        data.englishTerm3 = update.caScores.ENG.year3 || '-';
      }
      if (update.caScores.MTH) {
        data.arithmeticTerm1 = update.caScores.MTH.year1 || '-';
        data.arithmeticTerm2 = update.caScores.MTH.year2 || '-';
        data.arithmeticTerm3 = update.caScores.MTH.year3 || '-';
      }
      if (update.caScores.BST) {
        data.generalTerm1 = update.caScores.BST.year1 || '-';
        data.generalTerm2 = update.caScores.BST.year2 || '-';
        data.generalTerm3 = update.caScores.BST.year3 || '-';
      }
      if (update.caScores.RGS) {
        data.religiousTerm1 = update.caScores.RGS.year1 || '-';
        data.religiousTerm2 = update.caScores.RGS.year2 || '-';
        data.religiousTerm3 = update.caScores.RGS.year3 || '-';
      }
    }
    if (Array.isArray(update.studentSubjects)) {
      data.studentSubjects = update.studentSubjects;
    }
    
    // Handle religious type separately
    if (update.religious && typeof update.religious.type === 'string') {
      data.religiousType = update.religious.type;
    }
    
    // Legacy field handling (for older clients)
    if (update.english) {
      if (typeof update.english.term1 === 'string') data.englishTerm1 = update.english.term1;
      if (typeof update.english.term2 === 'string') data.englishTerm2 = update.english.term2;
      if (typeof update.english.term3 === 'string') data.englishTerm3 = update.english.term3;
    }
    if (update.arithmetic) {
      if (typeof update.arithmetic.term1 === 'string') data.arithmeticTerm1 = update.arithmetic.term1;
      if (typeof update.arithmetic.term2 === 'string') data.arithmeticTerm2 = update.arithmetic.term2;
      if (typeof update.arithmetic.term3 === 'string') data.arithmeticTerm3 = update.arithmetic.term3;
    }
    if (update.general) {
      if (typeof update.general.term1 === 'string') data.generalTerm1 = update.general.term1;
      if (typeof update.general.term2 === 'string') data.generalTerm2 = update.general.term2;
      if (typeof update.general.term3 === 'string') data.generalTerm3 = update.general.term3;
    }
    if (update.religious) {
      if (typeof update.religious.term1 === 'string') data.religiousTerm1 = update.religious.term1;
      if (typeof update.religious.term2 === 'string') data.religiousTerm2 = update.religious.term2;
      if (typeof update.religious.term3 === 'string') data.religiousTerm3 = update.religious.term3;
    }

    const result = await prisma.studentRegistration.updateMany({
      where: { id, schoolId: decoded.schoolId },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Registration not found or not owned by this school.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Registration updated.' }, { status: 200 });
  } catch (error) {
    console.error('Registration patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update registration. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body || {};
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid request. Provide id to delete.' },
        { status: 400 }
      );
    }

    const result = await prisma.studentRegistration.deleteMany({
      where: { id, schoolId: decoded.schoolId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Registration not found or not owned by this school.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Registration deleted.' }, { status: 200 });
  } catch (error) {
    console.error('Registration delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete registration. Please try again.' },
      { status: 500 }
    );
  }
}

// CA Score structure for dynamic subjects
interface CAScore {
  year1: string;
  year2: string;
  year3: string;
}

interface CAScores {
  [subjectCode: string]: CAScore;
}

interface RegistrationData {
  studentNumber: string;
  lastname: string;
  othername: string;
  firstname: string;
  dateOfBirth?: string;
  gender: string;
  schoolType: string;
  passport: string | null;
  // Legacy fields for backward compatibility
  english?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  arithmetic?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  general?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  religious?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string; type: string };
  // New dynamic CA scores
  caScores?: CAScores;
  studentSubjects?: string[];
  isLateRegistration?: boolean;
  year?: string;
  prcd?: number;
}

export async function GET(req: NextRequest) {
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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    // Fetch all registrations for this school
    const registrations = await prisma.studentRegistration.findMany({
      where: {
        schoolId: decoded.schoolId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map database fields to frontend fields
    const mappedRegistrations = registrations.map((r: any) => ({
      ...r,
      // Include dynamic CA scores and selected subjects
      caScores: r.caScores,
      studentSubjects: r.studentSubjects || [],
      // Legacy fields for backward compatibility
      english: {
        year1: r.englishTerm1 || '-',
        year2: r.englishTerm2 || '-',
        year3: r.englishTerm3 || '-',
      },
      arithmetic: {
        year1: r.arithmeticTerm1 || '-',
        year2: r.arithmeticTerm2 || '-',
        year3: r.arithmeticTerm3 || '-',
      },
      general: {
        year1: r.generalTerm1 || '-',
        year2: r.generalTerm2 || '-',
        year3: r.generalTerm3 || '-',
      },
      religious: {
        type: r.religiousType || '',
        year1: r.religiousTerm1 || '-',
        year2: r.religiousTerm2 || '-',
        year3: r.religiousTerm3 || '-',
      },
    }));

    return NextResponse.json(
      { registrations: mappedRegistrations },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch registrations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    // Get registrations and optional override flag from request body
    const { registrations, override } = await req.json();

    if (!registrations || !Array.isArray(registrations) || registrations.length === 0) {
      return NextResponse.json(
        { error: 'No registrations to save' },
        { status: 400 }
      );
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { id: decoded.schoolId },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Generate all unique accCodes in ONE batch query (10-100x faster!)
    const accCodes = await generateBatchAccCodes(prisma, registrations.length);
    
    // Debug: Log first registration to verify continuous assessment data
    if (registrations.length > 0) {
      console.log('First registration continuous assessment data:', {
        caScores: registrations[0].caScores,
        studentSubjects: registrations[0].studentSubjects,
        religious: registrations[0].religious,
      });
    }
    
    // Prepare data for bulk insert with pre-generated accCodes
    const studentData = registrations.map((reg: RegistrationData, index: number) => ({
      accCode: accCodes[index],
      studentNumber: reg.studentNumber,
      firstname: reg.firstname,
      othername: reg.othername || '',
      lastname: reg.lastname,
      dateOfBirth: reg.dateOfBirth ? new Date(reg.dateOfBirth) : null,
      gender: reg.gender,
      schoolType: reg.schoolType,
      passport: reg.passport,
      // Store dynamic CA scores and selected subjects
      caScores: reg.caScores ? (reg.caScores as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      studentSubjects: reg.studentSubjects || [],
      // Legacy fields - try to extract from caScores if available, otherwise use legacy fields
      englishTerm1: reg.caScores?.ENG?.year1 || reg.english?.year1 || reg.english?.term1 || '-',
      englishTerm2: reg.caScores?.ENG?.year2 || reg.english?.year2 || reg.english?.term2 || '-',
      englishTerm3: reg.caScores?.ENG?.year3 || reg.english?.year3 || reg.english?.term3 || '-',
      arithmeticTerm1: reg.caScores?.MTH?.year1 || reg.arithmetic?.year1 || reg.arithmetic?.term1 || '-',
      arithmeticTerm2: reg.caScores?.MTH?.year2 || reg.arithmetic?.year2 || reg.arithmetic?.term2 || '-',
      arithmeticTerm3: reg.caScores?.MTH?.year3 || reg.arithmetic?.year3 || reg.arithmetic?.term3 || '-',
      generalTerm1: reg.caScores?.BST?.year1 || reg.general?.year1 || reg.general?.term1 || '-',
      generalTerm2: reg.caScores?.BST?.year2 || reg.general?.year2 || reg.general?.term2 || '-',
      generalTerm3: reg.caScores?.BST?.year3 || reg.general?.year3 || reg.general?.term3 || '-',
      religiousType: reg.religious?.type || '',
      religiousTerm1: reg.caScores?.RGS?.year1 || reg.religious?.year1 || reg.religious?.term1 || '-',
      religiousTerm2: reg.caScores?.RGS?.year2 || reg.religious?.year2 || reg.religious?.term2 || '-',
      religiousTerm3: reg.caScores?.RGS?.year3 || reg.religious?.year3 || reg.religious?.term3 || '-',
      lateRegistration: reg.isLateRegistration || false,
      year: reg.year || '2025/2026',
      prcd: reg.prcd || 1,
      schoolId: decoded.schoolId,
    }));

    // Debug: Log first mapped student data to verify continuous assessment mapping
    if (studentData.length > 0) {
      console.log('First mapped student data (continuous assessment):', {
        caScores: studentData[0].caScores,
        studentSubjects: studentData[0].studentSubjects,
      });
    }

    // If override is true, replace all existing registrations for this school
    if (override === true) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.studentRegistration.deleteMany({ where: { schoolId: decoded.schoolId } });
        const created = await tx.studentRegistration.createMany({ data: studentData });
        return created;
      }, {
        maxWait: 20000, // Maximum time to wait for a transaction slot (20s)
        timeout: 30000, // Maximum time the transaction can run (30s)
      });
      return NextResponse.json(
        {
          message: 'Registrations replaced successfully',
          count: result.count,
        },
        { status: 201 }
      );
    }

    // Otherwise, enforce duplicate check and append
    const studentNumbers = studentData.map(s => s.studentNumber);
    const existingStudents = await prisma.studentRegistration.findMany({
      where: {
        studentNumber: {
          in: studentNumbers,
        },
      },
      select: {
        studentNumber: true,
      },
    });

    if (existingStudents.length > 0) {
      const duplicates = existingStudents.map(s => s.studentNumber).join(', ');
      return NextResponse.json(
        { error: `The following student numbers already exist: ${duplicates}` },
        { status: 400 }
      );
    }

    const result = await prisma.studentRegistration.createMany({ data: studentData });

    return NextResponse.json(
      {
        message: 'Registrations saved successfully',
        count: result.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration save error:', error);
    return NextResponse.json(
      { error: 'Failed to save registrations. Please try again.' },
      { status: 500 }
    );
  }
}
