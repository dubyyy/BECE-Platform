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

// Safely parse a date string, handling DD/MM/YYYY, ISO, and invalid values
function safeParseDateOfBirth(value: string | undefined | null): Date | null {
  if (!value) return null;
  // Handle DD/MM/YYYY format
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Validate CA score is between 1-100 or empty
function isValidCAScore(score: string | undefined | null): boolean {
  if (!score || score === '' || score === '-') return true;
  const num = Number(score);
  return !isNaN(num) && num >= 1 && num <= 100;
}

// Validate all CA scores in the caScores object
function validateCAScores(caScores: Record<string, { year1?: string; year2?: string; year3?: string }> | undefined): string | null {
  if (!caScores) return null;
  for (const [subject, scores] of Object.entries(caScores)) {
    if (scores.year1 && !isValidCAScore(scores.year1)) {
      return `Invalid CA score for ${subject} Year 1. Must be between 1-100.`;
    }
    if (scores.year2 && !isValidCAScore(scores.year2)) {
      return `Invalid CA score for ${subject} Year 2. Must be between 1-100.`;
    }
    if (scores.year3 && !isValidCAScore(scores.year3)) {
      return `Invalid CA score for ${subject} Year 3. Must be between 1-100.`;
    }
  }
  return null;
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
    } catch {
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

    // Validate CA scores (must be 1-100)
    if (update.caScores) {
      const validationError = validateCAScores(update.caScores);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    // Map nested client fields to flat DB columns if provided
    const data: Prisma.PostRegistrationUpdateManyMutationInput = {};
    if (typeof update.firstname === 'string') data.firstname = update.firstname;
    if (typeof update.othername === 'string') data.othername = update.othername;
    if (typeof update.lastname === 'string') data.lastname = update.lastname;
    if (typeof update.gender === 'string') data.gender = update.gender;
    if (typeof update.schoolType === 'string') data.schoolType = update.schoolType;
    if (typeof update.passport === 'string' || update.passport === null) data.passport = update.passport;
    if (typeof update.dateOfBirth === 'string') data.dateOfBirth = safeParseDateOfBirth(update.dateOfBirth);
    
    // Handle dynamic CA scores and student subjects
    if (update.caScores && typeof update.caScores === 'object') {
      data.caScores = update.caScores;
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
      if (update.caScores.ARB) {
        data.arabicTerm1 = update.caScores.ARB.year1 || '-';
        data.arabicTerm2 = update.caScores.ARB.year2 || '-';
        data.arabicTerm3 = update.caScores.ARB.year3 || '-';
      }
      if (update.caScores.BUS) {
        data.businessTerm1 = update.caScores.BUS.year1 || '-';
        data.businessTerm2 = update.caScores.BUS.year2 || '-';
        data.businessTerm3 = update.caScores.BUS.year3 || '-';
      }
      if (update.caScores.CCA) {
        data.ccaTerm1 = update.caScores.CCA.year1 || '-';
        data.ccaTerm2 = update.caScores.CCA.year2 || '-';
        data.ccaTerm3 = update.caScores.CCA.year3 || '-';
      }
      if (update.caScores.FRE) {
        data.frenchTerm1 = update.caScores.FRE.year1 || '-';
        data.frenchTerm2 = update.caScores.FRE.year2 || '-';
        data.frenchTerm3 = update.caScores.FRE.year3 || '-';
      }
      if (update.caScores.HST) {
        data.historyTerm1 = update.caScores.HST.year1 || '-';
        data.historyTerm2 = update.caScores.HST.year2 || '-';
        data.historyTerm3 = update.caScores.HST.year3 || '-';
      }
      if (update.caScores.LLG) {
        data.localLangTerm1 = update.caScores.LLG.year1 || '-';
        data.localLangTerm2 = update.caScores.LLG.year2 || '-';
        data.localLangTerm3 = update.caScores.LLG.year3 || '-';
      }
      if (update.caScores.NVS) {
        data.nvsTerm1 = update.caScores.NVS.year1 || '-';
        data.nvsTerm2 = update.caScores.NVS.year2 || '-';
        data.nvsTerm3 = update.caScores.NVS.year3 || '-';
      }
      if (update.caScores.PVS) {
        data.pvsTerm1 = update.caScores.PVS.year1 || '-';
        data.pvsTerm2 = update.caScores.PVS.year2 || '-';
        data.pvsTerm3 = update.caScores.PVS.year3 || '-';
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

    const result = await prisma.postRegistration.updateMany({
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
    } catch {
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

    const result = await prisma.postRegistration.deleteMany({
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

interface RegistrationData {
  studentNumber: string;
  lastname: string;
  othername: string;
  firstname: string;
  dateOfBirth?: string;
  gender: string;
  schoolType: string;
  passport: string | null;
  // Legacy fixed subject fields (optional for backward compatibility)
  english?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  arithmetic?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  general?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string };
  religious?: { term1?: string; term2?: string; term3?: string; year1?: string; year2?: string; year3?: string; type?: string };
  // New dynamic format
  caScores?: Record<string, { year1?: string; year2?: string; year3?: string }>;
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
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    // Fetch all post-registrations for this school
    const registrations = await prisma.postRegistration.findMany({
      where: {
        schoolId: decoded.schoolId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Also fetch StudentRegistration to find the max student number across both tables
    const studentRegistrations = await prisma.studentRegistration.findMany({
      where: {
        schoolId: decoded.schoolId,
      },
      select: {
        studentNumber: true,
      },
    });

    // Calculate the maximum student number from both tables
    let maxStudentNumber = 0;
    
    [...studentRegistrations, ...registrations].forEach((reg) => {
      if (reg.studentNumber) {
        const lastFour = reg.studentNumber.slice(-4);
        const num = parseInt(lastFour, 10);
        if (!isNaN(num) && num > maxStudentNumber) {
          maxStudentNumber = num;
        }
      }
    });

    // Map database fields (Term) to frontend fields (Year)
    const mappedRegistrations = registrations.map((r) => ({
      ...r,
      englishYear1: r.englishTerm1,
      englishYear2: r.englishTerm2,
      englishYear3: r.englishTerm3,
      arithmeticYear1: r.arithmeticTerm1,
      arithmeticYear2: r.arithmeticTerm2,
      arithmeticYear3: r.arithmeticTerm3,
      generalYear1: r.generalTerm1,
      generalYear2: r.generalTerm2,
      generalYear3: r.generalTerm3,
      religiousYear1: r.religiousTerm1,
      religiousYear2: r.religiousTerm2,
      religiousYear3: r.religiousTerm3,
    }));

    return NextResponse.json(
      { registrations: mappedRegistrations, maxStudentNumber },
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
    } catch {
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
        english: registrations[0].english,
        arithmetic: registrations[0].arithmetic,
        general: registrations[0].general,
        religious: registrations[0].religious,
      });
    }
    
    // Prepare data for bulk insert with pre-generated accCodes
    // Handle both new dynamic caScores format and legacy fixed subject format
    const studentData = registrations.map((reg: RegistrationData, index: number) => {
      // Extract CA scores - prioritize new caScores format, fall back to legacy fields
      const caScores = reg.caScores || {};
      const studentSubjects = reg.studentSubjects || [];
      
      // Get English scores (from caScores.ENG or legacy english field)
      const engScores = caScores['ENG'] || reg.english || {};
      const englishTerm1 = engScores.year1 || '-';
      const englishTerm2 = engScores.year2 || '-';
      const englishTerm3 = engScores.year3 || '-';
      
      // Get Math/Arithmetic scores (from caScores.MTH or legacy arithmetic field)
      const mathScores = caScores['MTH'] || reg.arithmetic || {};
      const arithmeticTerm1 = mathScores.year1 || '-';
      const arithmeticTerm2 = mathScores.year2 || '-';
      const arithmeticTerm3 = mathScores.year3 || '-';
      
      // Get General/Basic Science scores (from caScores.BST or legacy general field)
      const generalScores = caScores['BST'] || reg.general || {};
      const generalTerm1 = generalScores.year1 || '-';
      const generalTerm2 = generalScores.year2 || '-';
      const generalTerm3 = generalScores.year3 || '-';
      
      // Get Religious Studies scores (from caScores.RGS or legacy religious field)
      const religiousScores = caScores['RGS'] || reg.religious || {};
      const religiousType = reg.religious?.type || '';
      const religiousTerm1 = religiousScores.year1 || '-';
      const religiousTerm2 = religiousScores.year2 || '-';
      const religiousTerm3 = religiousScores.year3 || '-';
      
      return {
        accCode: accCodes[index],
        studentNumber: reg.studentNumber,
        firstname: reg.firstname,
        othername: reg.othername || '',
        lastname: reg.lastname,
        dateOfBirth: safeParseDateOfBirth(reg.dateOfBirth),
        gender: reg.gender,
        schoolType: reg.schoolType,
        passport: reg.passport,
        englishTerm1,
        englishTerm2,
        englishTerm3,
        arithmeticTerm1,
        arithmeticTerm2,
        arithmeticTerm3,
        generalTerm1,
        generalTerm2,
        generalTerm3,
        religiousType,
        religiousTerm1,
        religiousTerm2,
        religiousTerm3,
        arabicTerm1: caScores['ARB']?.year1 || '-',
        arabicTerm2: caScores['ARB']?.year2 || '-',
        arabicTerm3: caScores['ARB']?.year3 || '-',
        businessTerm1: caScores['BUS']?.year1 || '-',
        businessTerm2: caScores['BUS']?.year2 || '-',
        businessTerm3: caScores['BUS']?.year3 || '-',
        ccaTerm1: caScores['CCA']?.year1 || '-',
        ccaTerm2: caScores['CCA']?.year2 || '-',
        ccaTerm3: caScores['CCA']?.year3 || '-',
        frenchTerm1: caScores['FRE']?.year1 || '-',
        frenchTerm2: caScores['FRE']?.year2 || '-',
        frenchTerm3: caScores['FRE']?.year3 || '-',
        historyTerm1: caScores['HST']?.year1 || '-',
        historyTerm2: caScores['HST']?.year2 || '-',
        historyTerm3: caScores['HST']?.year3 || '-',
        localLangTerm1: caScores['LLG']?.year1 || '-',
        localLangTerm2: caScores['LLG']?.year2 || '-',
        localLangTerm3: caScores['LLG']?.year3 || '-',
        nvsTerm1: caScores['NVS']?.year1 || '-',
        nvsTerm2: caScores['NVS']?.year2 || '-',
        nvsTerm3: caScores['NVS']?.year3 || '-',
        pvsTerm1: caScores['PVS']?.year1 || '-',
        pvsTerm2: caScores['PVS']?.year2 || '-',
        pvsTerm3: caScores['PVS']?.year3 || '-',
        lateRegistration: reg.isLateRegistration || false,
        year: reg.year || '2025/2026',
        prcd: reg.prcd || 1,
        schoolId: decoded.schoolId,
        // Store the new dynamic format for future use
        studentSubjects: studentSubjects,
        caScores: caScores,
      };
    });

    // Debug: Log first mapped student data to verify continuous assessment mapping
    if (studentData.length > 0) {
      console.log('First mapped student data (continuous assessment):', {
        englishTerm1: studentData[0].englishTerm1,
        englishTerm2: studentData[0].englishTerm2,
        englishTerm3: studentData[0].englishTerm3,
        arithmeticTerm1: studentData[0].arithmeticTerm1,
        generalTerm1: studentData[0].generalTerm1,
        religiousTerm1: studentData[0].religiousTerm1,
      });
    }

    // If override is true, replace all existing post-registrations for this school
    if (override === true) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.postRegistration.deleteMany({ where: { schoolId: decoded.schoolId } });
        const created = await tx.postRegistration.createMany({ data: studentData });
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
    const existingStudents = await prisma.postRegistration.findMany({
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

    const result = await prisma.postRegistration.createMany({ data: studentData });

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
