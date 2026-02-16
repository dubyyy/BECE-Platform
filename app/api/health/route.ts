import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startTime = Date.now();
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  // Test 1: Raw database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.dbConnection = 'OK';
  } catch (err) {
    diagnostics.dbConnection = 'FAILED';
    diagnostics.dbError = err instanceof Error ? err.message : String(err);
  }

  // Test 2: Query StudentRegistration table (the one that 500s)
  try {
    const count = await prisma.studentRegistration.count();
    diagnostics.studentRegistrationTable = { status: 'OK', count };
  } catch (err) {
    diagnostics.studentRegistrationTable = {
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test 3: Query PostRegistration table (the other one that 500s)
  try {
    const count = await prisma.postRegistration.count();
    diagnostics.postRegistrationTable = { status: 'OK', count };
  } catch (err) {
    diagnostics.postRegistrationTable = {
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test 4: Query School table
  try {
    const count = await prisma.school.count();
    diagnostics.schoolTable = { status: 'OK', count };
  } catch (err) {
    diagnostics.schoolTable = {
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  diagnostics.responseTime = `${Date.now() - startTime}ms`;
  
  const allOk = diagnostics.dbConnection === 'OK' 
    && (diagnostics.studentRegistrationTable as Record<string, unknown>)?.status === 'OK'
    && (diagnostics.postRegistrationTable as Record<string, unknown>)?.status === 'OK';

  return NextResponse.json(diagnostics, {
    status: allOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
