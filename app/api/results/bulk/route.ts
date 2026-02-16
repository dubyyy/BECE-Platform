import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
  SCHOOLCODE?: string;
  SCHOOLCOBE?: string;
  LGACD: string;
  EXAMINATIONNO: string;
  ENG: string;
  ENGGRD: string;
  ARIT?: string;
  ARITGRD?: string;
  MTH?: string;
  MTHGRD?: string;
  GP?: string;
  GPGRD?: string;
  BST?: string;
  BSTGRD?: string;
  RGS?: string;
  RGSGRD?: string;
  HST?: string;
  HSTGRD?: string;
  ARB?: string;
  ARBGRD?: string;
  CCA?: string;
  CCAGRD?: string;
  FRE?: string;
  FREGRD?: string;
  NVS?: string;
  NVSGRD?: string;
  LLG?: string;
  LLGGRD?: string;
  PVS?: string;
  PVSGRD?: string;
  BUS?: string;
  BUSGRD?: string;
  RGSTYPE?: string;
  rgsType?: string;
  REMARK: string;
  ACCESS_PIN?: string;
  'ACCESS PIN'?: string;
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

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row as unknown as CSVRow);
  }

  return rows;
}

function mapCSVRowToResult(row: CSVRow) {
  // Handle both SCHOOLCODE and SCHOOLCOBE column names
  const schoolCode = row.SCHOOLCODE || row.SCHOOLCOBE || '';
  const schoolName = getSchoolNameByCode(schoolCode, row.LGACD);
  
  // Handle both ACCESS_PIN and "ACCESS PIN" column names
  const accessPin = row.ACCESS_PIN || row['ACCESS PIN'] || `PIN-${row.EXAMINATIONNO}`;
  
  // Handle both RGSTYPE and rgsType column names
  const rgsType = row.RGSTYPE || row.rgsType || null;
  
  return {
    sessionYr: row.SESSIONYR,
    fName: row.FNAME,
    mName: row.MNAME || null,
    lName: row.LNAME,
    dateOfBirth: row.DATEOFBIRTH ? new Date(row.DATEOFBIRTH) : null,
    sexCd: row.SEXCD,
    institutionCd: row.INSTITUTIONCD,
    schoolName: schoolName || `UNKNOWN (Code: ${schoolCode})`,
    lgaCd: row.LGACD,
    examinationNo: row.EXAMINATIONNO,
    eng: row.ENG ? parseFloat(row.ENG) : null,
    engGrd: row.ENGGRD || null,
    arit: row.ARIT ? parseFloat(row.ARIT) : null,
    aritGrd: row.ARITGRD || null,
    mth: row.MTH ? parseFloat(row.MTH) : null,
    mthGrd: row.MTHGRD || null,
    gp: row.GP ? parseFloat(row.GP) : null,
    gpGrd: row.GPGRD || null,
    bst: row.BST ? parseFloat(row.BST) : null,
    bstGrd: row.BSTGRD || null,
    rgs: row.RGS ? parseFloat(row.RGS) : null,
    rgsGrd: row.RGSGRD || null,
    hst: row.HST ? parseFloat(row.HST) : null,
    hstGrd: row.HSTGRD || null,
    arb: row.ARB ? parseFloat(row.ARB) : null,
    arbGrd: row.ARBGRD || null,
    cca: row.CCA ? parseFloat(row.CCA) : null,
    ccaGrd: row.CCAGRD || null,
    fre: row.FRE ? parseFloat(row.FRE) : null,
    freGrd: row.FREGRD || null,
    nvs: row.NVS ? parseFloat(row.NVS) : null,
    nvsGrd: row.NVSGRD || null,
    llg: row.LLG ? parseFloat(row.LLG) : null,
    llgGrd: row.LLGGRD || null,
    pvs: row.PVS ? parseFloat(row.PVS) : null,
    pvsGrd: row.PVSGRD || null,
    bus: row.BUS ? parseFloat(row.BUS) : null,
    busGrd: row.BUSGRD || null,
    rgstype: rgsType,
    remark: row.REMARK || null,
    accessPin: accessPin,
  };
}

export async function POST(request: NextRequest) {
  // Check if client wants streaming progress
  const useStreaming = request.headers.get('Accept') === 'text/event-stream';

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

    // If streaming is requested, use SSE
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendProgress = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          const errors: Array<{ row: number; error: string }> = [];
          const BATCH_SIZE = 50;
          let createdCount = 0;
          let processedCount = 0;

          // Phase 1: Validation (0-50%)
          sendProgress({ phase: 'validating', progress: 0, message: 'Starting validation...' });

          const resultsToCreate = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            if (!row.SESSIONYR || !row.EXAMINATIONNO || (!row.FNAME && !row.LNAME)) {
              errors.push({
                row: i + 2,
                error: 'Missing required fields (SESSIONYR, EXAMINATIONNO, or name)',
              });
            } else {
              // Check if examination number already exists
              const existing = await prisma.result.findUnique({
                where: { examinationNo: row.EXAMINATIONNO },
              });

              if (existing) {
                errors.push({
                  row: i + 2,
                  error: `Examination number ${row.EXAMINATIONNO} already exists`,
                });
              } else {
                resultsToCreate.push(mapCSVRowToResult(row));
              }
            }

            processedCount++;
            // Update progress every 50 rows or at the end
            if (processedCount % 50 === 0 || processedCount === rows.length) {
              const validationProgress = Math.round((processedCount / rows.length) * 50);
              sendProgress({
                phase: 'validating',
                progress: validationProgress,
                message: `Validating records... ${processedCount}/${rows.length}`,
                validated: processedCount,
                total: rows.length,
              });
            }
          }

          // Phase 2: Inserting (50-100%)
          sendProgress({ phase: 'inserting', progress: 50, message: 'Starting database insert...' });

          if (resultsToCreate.length > 0) {
            const totalBatches = Math.ceil(resultsToCreate.length / BATCH_SIZE);
            
            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
              const start = batchIndex * BATCH_SIZE;
              const end = Math.min(start + BATCH_SIZE, resultsToCreate.length);
              const batch = resultsToCreate.slice(start, end);

              try {
                const result = await prisma.result.createMany({
                  data: batch.map((r) => ({ ...r, blocked: shouldBlockNewResults })),
                  skipDuplicates: true,
                });
                createdCount += result.count;
              } catch (batchError) {
                console.error(`Batch ${batchIndex + 1} error:`, batchError);
              }

              const insertProgress = 50 + Math.round(((batchIndex + 1) / totalBatches) * 50);
              sendProgress({
                phase: 'inserting',
                progress: insertProgress,
                message: `Inserting records... ${end}/${resultsToCreate.length}`,
                inserted: end,
                totalToInsert: resultsToCreate.length,
              });
            }
          }

          // Final result
          sendProgress({
            phase: 'complete',
            progress: 100,
            message: `Successfully created ${createdCount} results`,
            success: true,
            created: createdCount,
            errors: errors.length > 0 ? errors : undefined,
            totalProcessed: rows.length,
          });

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming fallback (original behavior)
    const resultsToCreate = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row.SESSIONYR || !row.EXAMINATIONNO || (!row.FNAME && !row.LNAME)) {
        errors.push({
          row: i + 2,
          error: 'Missing required fields (SESSIONYR, EXAMINATIONNO, or name)',
        });
        continue;
      }

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
