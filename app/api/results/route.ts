import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import crypto from 'crypto';

const GLOBAL_RESULTS_RELEASE_KEY = '__GLOBAL_RESULTS_RELEASE__';

const timingSafeEqualString = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

// ==========================
//          GET
// ==========================
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(request, RATE_LIMITS.READ);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const accessPin = searchParams.get('accessPin') ?? searchParams.get('pinCode');
    const serialNumber = searchParams.get('serial');
    const examinationNumber = searchParams.get('examNumber');

    // Validate required fields
    if (!accessPin || !examinationNumber) {
      return NextResponse.json(
        { error: 'Access Pin and Examination Number are required.' },
        { status: 400 }
      );
    }

    const masterPin = process.env.MASTER_PIN;
    const isMasterPin =
      typeof masterPin === 'string' &&
      masterPin.length > 0 &&
      timingSafeEqualString(accessPin, masterPin);

    if (!isMasterPin) {
      const globalSetting = await prisma.accessPin.findUnique({
        where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
        select: { isActive: true },
      });

      if (globalSetting && !globalSetting.isActive) {
        return NextResponse.json(
          { error: 'Results access is currently disabled.' },
          { status: 403 }
        );
      }
    }

    // Query database
    // For non-master PIN lookups, blocked results should not be accessible.
    const result = await prisma.result.findFirst({
      where: {
        ...(isMasterPin ? {} : { accessPin }),
        examinationNo: examinationNumber,
        ...(isMasterPin ? {} : { blocked: false }),
      },
    });

    if (!result) {
      // Distinguish between "not found" and "blocked" for correct credentials.
      // This keeps the behavior consistent for normal users while allowing admins
      // to understand why access is denied.
      const blockedResult = await prisma.result.findFirst({
        where: {
          ...(isMasterPin ? {} : { accessPin }),
          examinationNo: examinationNumber,
          blocked: true,
        },
        select: { id: true },
      });

      if (blockedResult && !isMasterPin) {
        return NextResponse.json(
          { error: 'Access to this result has been disabled contact the Ministry' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'No result found with the provided credentials.' },
        { status: 404 }
      );
    }

    // Fetch passport from StudentRegistration using the same accessPin
    const studentRegistration = await prisma.studentRegistration.findFirst({
      where: {
        accCode: accessPin,
      },
      select: {
        passport: true,
      },
    });

    // ✅ Return result with passport from StudentRegistration
    return NextResponse.json({
      ...result,
      passport: studentRegistration?.passport || null,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching result:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch result. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ==========================
//          POST
// ==========================
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(request, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const body = await request.json();

    const {
      sessionYr,
      fName,
      mName,
      lName,
      dateOfBirth,
      sexCd,
      institutionCd,
      schoolName,
      lgaCd,
      examinationNo,
      eng,
      engGrd,
      arit,
      aritGrd,
      gp,
      gpGrd,
      rgs,
      rgsGrd,
      remark,
      accessPin,
    } = body;

    if (!sessionYr || !examinationNo || (!fName && !lName)) {
      return NextResponse.json(
        { error: 'Session year, examination number, and at least one name field are required.' },
        { status: 400 }
      );
    }

    const existingResult = await prisma.result.findUnique({
      where: { examinationNo },
    });

    if (existingResult) {
      return NextResponse.json(
        { error: 'A result with this examination number already exists.' },
        { status: 409 }
      );
    }

    const globalSetting = await prisma.accessPin.findUnique({
      where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
      select: { isActive: true },
    });

    const shouldBlockNewResults = globalSetting ? !globalSetting.isActive : false;

    const result = await prisma.result.create({
      data: {
        sessionYr,
        fName,
        mName,
        lName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        sexCd,
        institutionCd,
        schoolName,
        lgaCd,
        examinationNo,
        eng: eng ? parseFloat(eng) : null,
        engGrd,
        arit: arit ? parseFloat(arit) : null,
        aritGrd,
        gp: gp ? parseFloat(gp) : null,
        gpGrd,
        rgs: rgs ? parseFloat(rgs) : null,
        rgsGrd,
        remark,
        accessPin,
        blocked: shouldBlockNewResults,
      },
    });

    // ✅ Return ONLY the created result object
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating result:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit result. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
