import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLGACode } from '@/lib/lga-mapping';
import schoolsData from '@/data.json';

const CHUNK_SIZE = 5000;

type SchoolDataJson = {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function studentToRow(student: any, resolveLCode: (lgaCode: string, schCode: string) => string) {
  const religiousTypeCode = student.religiousType?.toLowerCase() === "christian" ? "1"
    : student.religiousType?.toLowerCase() === "islam" ? "2" : "";
  const schoolTypeCode = student.schoolType?.toLowerCase() === "private" ? "1" : "0";
  const lCode = resolveLCode(student.school.lgaCode, student.school.schoolCode);

  return [
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
    religiousTypeCode,
    schoolTypeCode,
    student.school.schoolCode || "",
    lCode,
    student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : "",
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const lga = searchParams.get("lga");
    const schoolCode = searchParams.get("schoolCode");
    const registrationType = searchParams.get("registrationType");
    const cursor = searchParams.get("cursor") || undefined;
    const table = searchParams.get("table") || "studentRegistration"; // which table to query
    const countOnly = searchParams.get("countOnly") === "true";

    // Build where clauses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { firstname: { contains: search, mode: "insensitive" } },
        { lastname: { contains: search, mode: "insensitive" } },
        { studentNumber: { contains: search, mode: "insensitive" } },
      ];
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
      where.school = { is: schoolWhere };
    }

    // Add lateRegistration filter for studentRegistration table
    if (table === "studentRegistration-regular") {
      where.lateRegistration = false;
    } else if (table === "studentRegistration-late") {
      where.lateRegistration = true;
    }

    const modelName = table.startsWith("studentRegistration") ? "studentRegistration" : "postRegistration";

    // If countOnly, return counts for all relevant tables
    if (countOnly) {
      const shouldQueryRegular = !registrationType || registrationType === "all" || registrationType === "regular";
      const shouldQueryLate = !registrationType || registrationType === "all" || registrationType === "late";
      const shouldQueryPost = !registrationType || registrationType === "all" || registrationType === "post";

      const counts: { table: string; count: number }[] = [];

      if (shouldQueryRegular) {
        const regularWhere = { ...where, lateRegistration: false };
        // Remove lateRegistration if it was set by table param
        delete regularWhere.lateRegistration;
        const baseWhere = { ...where };
        delete baseWhere.lateRegistration;
        const count = await prisma.studentRegistration.count({ where: { ...baseWhere, lateRegistration: false } });
        counts.push({ table: "studentRegistration-regular", count });
      }

      if (shouldQueryLate) {
        const baseWhere = { ...where };
        delete baseWhere.lateRegistration;
        const count = await prisma.studentRegistration.count({ where: { ...baseWhere, lateRegistration: true } });
        counts.push({ table: "studentRegistration-late", count });
      }

      if (shouldQueryPost) {
        const baseWhere = { ...where };
        delete baseWhere.lateRegistration;
        const count = await prisma.postRegistration.count({ where: baseWhere });
        counts.push({ table: "postRegistration", count });
      }

      const totalCount = counts.reduce((sum, c) => sum + c.count, 0);

      return Response.json({ totalCount, tables: counts });
    }

    // Pre-fetch all SchoolData for lCode mapping
    const allSchoolData = await prisma.schoolData.findMany({
      select: { lgaCode: true, lCode: true, schCode: true },
    });
    const schoolDataMap = new Map<string, string>();
    for (const sd of allSchoolData) {
      schoolDataMap.set(`${sd.lCode}-${sd.schCode}`, sd.lgaCode);
      schoolDataMap.set(`${sd.lgaCode}-${sd.schCode}`, sd.lgaCode);
    }
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

    // Only select fields needed for CSV (excludes passport, caScores, etc.)
    const selectFields = {
      id: true,
      year: true,
      studentNumber: true,
      accCode: true,
      firstname: true,
      othername: true,
      lastname: true,
      gender: true,
      schoolType: true,
      dateOfBirth: true,
      religiousType: true,
      englishTerm1: true, englishTerm2: true, englishTerm3: true,
      arithmeticTerm1: true, arithmeticTerm2: true, arithmeticTerm3: true,
      generalTerm1: true, generalTerm2: true, generalTerm3: true,
      religiousTerm1: true, religiousTerm2: true, religiousTerm3: true,
      arabicTerm1: true, arabicTerm2: true, arabicTerm3: true,
      businessTerm1: true, businessTerm2: true, businessTerm3: true,
      ccaTerm1: true, ccaTerm2: true, ccaTerm3: true,
      frenchTerm1: true, frenchTerm2: true, frenchTerm3: true,
      historyTerm1: true, historyTerm2: true, historyTerm3: true,
      localLangTerm1: true, localLangTerm2: true, localLangTerm3: true,
      nvsTerm1: true, nvsTerm2: true, nvsTerm3: true,
      pvsTerm1: true, pvsTerm2: true, pvsTerm3: true,
      school: { select: { schoolName: true, schoolCode: true, lgaCode: true } },
    };

    // Fetch a chunk using cursor-based pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryArgs: any = {
      where,
      select: selectFields,
      orderBy: { createdAt: "desc" as const },
      take: CHUNK_SIZE,
    };

    if (cursor) {
      queryArgs.cursor = { id: cursor };
      queryArgs.skip = 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch: any[] = await (prisma[modelName] as any).findMany(queryArgs);

    const rows = batch.map(student => studentToRow(student, resolveLCode));
    const nextCursor = batch.length === CHUNK_SIZE ? batch[batch.length - 1].id : null;

    return Response.json({
      rows,
      nextCursor,
      chunkSize: batch.length,
      hasMore: batch.length === CHUNK_SIZE,
    });
  } catch (error) {
    console.error("Export chunk error:", error);
    return Response.json(
      { error: "Failed to export chunk", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
