import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLGACode } from '@/lib/lga-mapping';
import schoolsData from '@/data.json';

const BATCH_SIZE = 5000;

type SchoolDataJson = {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
};

// Build CSV row, escaping commas and quotes
function csvRow(fields: string[]): string {
  return fields.map(f => {
    const val = f ?? "";
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(",") + "\n";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const lga = searchParams.get("lga");
    const schoolCode = searchParams.get("schoolCode");
    const registrationType = searchParams.get("registrationType");

    // Build where clauses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentWhere: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postWhere: any = {};

    if (search) {
      const orClause = [
        { firstname: { contains: search, mode: "insensitive" } },
        { lastname: { contains: search, mode: "insensitive" } },
        { studentNumber: { contains: search, mode: "insensitive" } },
      ];
      studentWhere.OR = orClause;
      postWhere.OR = orClause;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let schoolWhere: any = undefined;
    if (lga && lga !== "all") {
      const lgaCode = getLGACode(lga);
      if (lgaCode) {
        schoolWhere = { ...(schoolWhere || {}), lgaCode };
      }
    }
    if (schoolCode && schoolCode !== "all") {
      schoolWhere = { ...(schoolWhere || {}), schoolCode };
    }
    if (schoolWhere) {
      studentWhere.school = { is: schoolWhere };
      postWhere.school = { is: schoolWhere };
    }

    const shouldQueryRegular = !registrationType || registrationType === "all" || registrationType === "regular";
    const shouldQueryLate = !registrationType || registrationType === "all" || registrationType === "late";
    const shouldQueryPost = !registrationType || registrationType === "all" || registrationType === "post";

    // Pre-fetch all SchoolData for lCode mapping (one query, not per-school)
    const allSchoolData = await prisma.schoolData.findMany({
      select: { lgaCode: true, lCode: true, schCode: true },
    });
    const schoolDataMap = new Map<string, string>();
    for (const sd of allSchoolData) {
      schoolDataMap.set(`${sd.lCode}-${sd.schCode}`, sd.lgaCode);
      schoolDataMap.set(`${sd.lgaCode}-${sd.schCode}`, sd.lgaCode);
    }
    // Also build from JSON fallback
    for (const s of schoolsData as SchoolDataJson[]) {
      const key1 = `${s.lCode}-${s.schCode}`;
      const key2 = `${s.lgaCode}-${s.schCode}`;
      if (!schoolDataMap.has(key1) && s.lgaCode) schoolDataMap.set(key1, String(s.lgaCode));
      if (!schoolDataMap.has(key2) && s.lgaCode) schoolDataMap.set(key2, String(s.lgaCode));
    }

    function resolveLCode(lgaCode: string, schCode: string): string {
      const normalizedSchCode = schCode.replace(/^0+/, "") || schCode;
      return schoolDataMap.get(`${lgaCode}-${schCode}`)
        || schoolDataMap.get(`${lgaCode}-${normalizedSchCode}`)
        || "";
    }

    // CSV header matching the BECE format
    const headers = [
      "S/N",
      "school_session",
      "progID",
      "Reg. No",
      "ACCESSCODE",
      "Surename",
      "Other Name(s)",
      "First Name",
      "Gender",
      "ARBY1", "ARBY2", "ARBY3",
      "BSTY1", "BSTY2", "BSTY3",
      "BUSY1", "BUSY2", "BUSY3",
      "CCAY1", "CCAY2", "CCAY3",
      "ENGY1", "ENGY2", "ENGY3",
      "FREY1", "FREY2", "FREY3",
      "HSTY1", "HSTY2", "HSTY3",
      "LLGY1", "LLGY2", "LLGY3",
      "MTHY1", "MTHY2", "MTHY3",
      "NVSY1", "NVSY2", "NVSY3",
      "PVSY1", "PVSY2", "PVSY3",
      "RGSY1", "RGSY2", "RGSY3",
      "TECY1", "TECY2", "TECY3",
      "rgsType",
      "schType",
      "schcode",
      "lgacode",
      "DATE OF BIRTH",
    ];

    let rowCounter = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function studentToCsvRow(student: any): string {
      rowCounter++;

      const religiousTypeCode = student.religiousType?.toLowerCase() === "christian" ? "1"
        : student.religiousType?.toLowerCase() === "islam" ? "2" : "";
      const schoolTypeCode = student.schoolType?.toLowerCase() === "private" ? "1" : "0";
      const lCode = resolveLCode(student.school.lgaCode, student.school.schoolCode);

      return csvRow([
        String(rowCounter),
        student.year || "",
        "2",
        student.studentNumber || "",
        student.accCode || "",
        student.lastname || "",
        student.othername || "",
        student.firstname || "",
        student.gender || "",
        student.arabicTerm1 || "", student.arabicTerm2 || "", student.arabicTerm3 || "",
        student.generalTerm1 || "", student.generalTerm2 || "", student.generalTerm3 || "",
        student.businessTerm1 || "", student.businessTerm2 || "", student.businessTerm3 || "",
        student.ccaTerm1 || "", student.ccaTerm2 || "", student.ccaTerm3 || "",
        student.englishTerm1 || "", student.englishTerm2 || "", student.englishTerm3 || "",
        student.frenchTerm1 || "", student.frenchTerm2 || "", student.frenchTerm3 || "",
        student.historyTerm1 || "", student.historyTerm2 || "", student.historyTerm3 || "",
        student.localLangTerm1 || "", student.localLangTerm2 || "", student.localLangTerm3 || "",
        student.arithmeticTerm1 || "", student.arithmeticTerm2 || "", student.arithmeticTerm3 || "",
        student.nvsTerm1 || "", student.nvsTerm2 || "", student.nvsTerm3 || "",
        student.pvsTerm1 || "", student.pvsTerm2 || "", student.pvsTerm3 || "",
        student.religiousTerm1 || "", student.religiousTerm2 || "", student.religiousTerm3 || "",
        student.technologyTerm1 || "", student.technologyTerm2 || "", student.technologyTerm3 || "",
        religiousTypeCode,
        schoolTypeCode,
        student.school.schoolCode || "",
        lCode,
        student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : "",
      ]);
    }

    // Stream CSV in batches using cursor-based pagination
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Write header
          controller.enqueue(new TextEncoder().encode(csvRow(headers)));

          // Helper: fetch and stream one table in batches
          async function streamTable(
            model: 'studentRegistration' | 'postRegistration',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: any,
          ) {
            let cursor: string | undefined = undefined;
            let hasMore = true;

            while (hasMore) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const queryArgs: any = {
                where,
                include: {
                  school: {
                    select: { schoolName: true, schoolCode: true, lgaCode: true },
                  },
                },
                orderBy: { createdAt: "desc" as const },
                take: BATCH_SIZE,
              };

              if (cursor) {
                queryArgs.cursor = { id: cursor };
                queryArgs.skip = 1;
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const batch: any[] = await (prisma[model] as any).findMany(queryArgs);

              if (batch.length === 0) {
                hasMore = false;
                break;
              }

              let chunk = "";
              for (const student of batch) {
                chunk += studentToCsvRow(student);
              }
              controller.enqueue(new TextEncoder().encode(chunk));

              cursor = batch[batch.length - 1].id;

              if (batch.length < BATCH_SIZE) {
                hasMore = false;
              }
            }
          }

          // Stream regular students
          if (shouldQueryRegular) {
            await streamTable('studentRegistration', { ...studentWhere, lateRegistration: false });
          }

          // Stream late students
          if (shouldQueryLate) {
            await streamTable('studentRegistration', { ...studentWhere, lateRegistration: true });
          }

          // Stream post students
          if (shouldQueryPost) {
            await streamTable('postRegistration', { ...postWhere });
          }

          controller.close();
        } catch (err) {
          console.error("Export stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students_export_${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to export students", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
