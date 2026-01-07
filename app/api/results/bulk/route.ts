import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import * as fs from 'fs';
import * as path from 'path';

const GLOBAL_RESULTS_RELEASE_KEY = '__GLOBAL_RESULTS_RELEASE__';

interface SchoolData {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

let schoolsDataCache: SchoolData[] | null = null;

function loadSchoolsData(): SchoolData[] {
  if (schoolsDataCache) {
    return schoolsDataCache;
  }
  
  const dataPath = path.join(process.cwd(), 'data.json');
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  schoolsDataCache = JSON.parse(fileContent);
  return schoolsDataCache!;
}

function getSchoolNameByCode(schoolCode: string, lgaCode: string): string | null {
  const schoolsData = loadSchoolsData();
  const school = schoolsData.find(
    s => s.schCode === schoolCode && s.lgaCode === lgaCode
  );
  return school ? school.schName : null;
}

interface CSVRow {
  SESSIONYR: string;
  FNAME: string;
  MNAME: string;
  LNAME: string;
  DATEOFBIRTH: string;
  SEXCD: string;
  INSTITUTIONCD: string;
  SCHOOLCODE: string;
  LGACD: string;
  EXAMINATIONNO: string;
  ENG: string;
  ENGGRD: string;
  ARIT: string;
  ARITGRD: string;
  GP: string;
  GPGRD: string;
  RGS: string;
  RGSGRD: string;
  RGSTYPE: string; // Added: Religious type (IRS/CRS)
  REMARK: string;
  ACCESS_PIN: string;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

function mapCSVRowToResult(row: CSVRow) {
  const schoolName = getSchoolNameByCode(row.SCHOOLCODE, row.LGACD);
  
  return {
    sessionYr: row.SESSIONYR,
    fName: row.FNAME,
    mName: row.MNAME || null,
    lName: row.LNAME,
    dateOfBirth: row.DATEOFBIRTH ? new Date(row.DATEOFBIRTH) : null,
    sexCd: row.SEXCD,
    institutionCd: row.INSTITUTIONCD,
    schoolName: schoolName || `UNKNOWN (Code: ${row.SCHOOLCODE})`,
    lgaCd: row.LGACD,
    examinationNo: row.EXAMINATIONNO,
    eng: row.ENG ? parseFloat(row.ENG) : null,
    engGrd: row.ENGGRD || null,
    arit: row.ARIT ? parseFloat(row.ARIT) : null,
    aritGrd: row.ARITGRD || null,
    gp: row.GP ? parseFloat(row.GP) : null,
    gpGrd: row.GPGRD || null,
    rgs: row.RGS ? parseFloat(row.RGS) : null,
    rgsGrd: row.RGSGRD || null,
    rgstype: row.RGSTYPE || null,
    remark: row.REMARK || null,
    accessPin: row.ACCESS_PIN || `PIN-${row.EXAMINATIONNO}`,
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(request, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const globalSetting = await prisma.accessPin.findUnique({
      where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
      select: { isActive: true },
    });

    const shouldBlockNewResults = globalSetting ? !globalSetting.isActive : false;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are accepted' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in CSV' },
        { status: 400 }
      );
    }

    // Validate and prepare data
    const resultsToCreate = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row.SESSIONYR || !row.EXAMINATIONNO || (!row.FNAME && !row.LNAME)) {
        errors.push({
          row: i + 2, // +2 because index 0 is headers and array is 0-indexed
          error: 'Missing required fields (SESSIONYR, EXAMINATIONNO, or name)',
        });
        continue;
      }

      // Check if examination number already exists
      const existing = await prisma.result.findUnique({
        where: { examinationNo: row.EXAMINATIONNO },
      });

      if (existing) {
        errors.push({
          row: i + 2,
          error: `Examination number ${row.EXAMINATIONNO} already exists`,
        });
        continue;
      }

      resultsToCreate.push(mapCSVRowToResult(row));
    }

    // Bulk create results
    let createdCount = 0;
    if (resultsToCreate.length > 0) {
      const result = await prisma.result.createMany({
        data: resultsToCreate.map((r) => ({ ...r, blocked: shouldBlockNewResults })),
        skipDuplicates: true,
      });
      createdCount = result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdCount} results`,
      created: createdCount,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: rows.length,
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      {
        error: 'Failed to process CSV file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
