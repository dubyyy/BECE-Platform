import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getLGAName, getLGACode } from "@/lib/lga-mapping";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import schoolsData from "@/data.json";

type SchoolDataJson = {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
};

type StudentWithSchool = Prisma.StudentRegistrationGetPayload<{
  include: { school: { select: { schoolName: true; schoolCode: true; lgaCode: true } } };
}>;

type PostWithSchool = Prisma.PostRegistrationGetPayload<{
  include: { school: { select: { schoolName: true; schoolCode: true; lgaCode: true } } };
}>;

type StudentRow = (StudentWithSchool | PostWithSchool) & {
  registrationType: "regular" | "late" | "post";
};

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(request, RATE_LIMITS.READ);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const lga = searchParams.get("lga");
    const schoolCode = searchParams.get("schoolCode");
    const registrationType = searchParams.get("registrationType"); // "all", "regular", "late", or "post"
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000); // Max 1000 per page
    const skip = (page - 1) * limit;
    
    // Build where clauses
    const studentWhere: Prisma.StudentRegistrationWhereInput = {};
    const postWhere: Prisma.PostRegistrationWhereInput = {};
    
    // Search by name or student number
    if (search) {
      const studentOr: Prisma.StudentRegistrationWhereInput[] = [
        {
          firstname: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          lastname: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          studentNumber: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];

      const postOr: Prisma.PostRegistrationWhereInput[] = [
        {
          firstname: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          lastname: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          studentNumber: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];

      studentWhere.OR = studentOr;
      postWhere.OR = postOr;
    }

    // Filter by School relation
    let schoolWhere: Prisma.SchoolWhereInput | undefined;

    // Filter by LGA
    if (lga && lga !== "all") {
      // Convert LGA name to code (frontend sends names, backend uses codes)
      const lgaCode = getLGACode(lga);
      if (lgaCode) {
        schoolWhere = { ...(schoolWhere || {}), lgaCode };
      }
    }

    // Filter by school code
    if (schoolCode && schoolCode !== "all") {
      schoolWhere = { ...(schoolWhere || {}), schoolCode };
    }

    if (schoolWhere) {
      studentWhere.school = { is: schoolWhere };
      postWhere.school = { is: schoolWhere };
    }
    
    // Determine which tables/types to query based on registration type filter
    const shouldQueryRegular = !registrationType || registrationType === "all" || registrationType === "regular";
    const shouldQueryLate = !registrationType || registrationType === "all" || registrationType === "late";
    const shouldQueryPost = !registrationType || registrationType === "all" || registrationType === "post";
    
    let allStudents: StudentRow[] = [];
    let totalCount = 0;

    // When querying all types, we need to fetch enough from each table
    // to correctly paginate the combined + sorted result
    const allTypeLimit = skip + limit;
    
    // Query regular students (not late) if needed
    if (shouldQueryRegular) {
      const regularWhere = { 
        ...studentWhere, 
        lateRegistration: false 
      };
      
      const [regularStudents, regularCount] = await Promise.all([
        prisma.studentRegistration.findMany({
          where: regularWhere,
          include: {
            school: {
              select: {
                schoolName: true,
                schoolCode: true,
                lgaCode: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: registrationType === "regular" ? skip : 0,
          take: registrationType === "regular" ? limit : allTypeLimit,
        }),
        prisma.studentRegistration.count({ where: regularWhere }),
      ]);
      
      allStudents = allStudents.concat(regularStudents.map(student => ({ ...student, registrationType: "regular" } as const)));
      totalCount += regularCount;
    }
    
    // Query late students if needed
    if (shouldQueryLate) {
      const lateWhere = { 
        ...studentWhere, 
        lateRegistration: true 
      };
      
      const [lateStudents, lateCount] = await Promise.all([
        prisma.studentRegistration.findMany({
          where: lateWhere,
          include: {
            school: {
              select: {
                schoolName: true,
                schoolCode: true,
                lgaCode: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: registrationType === "late" ? skip : 0,
          take: registrationType === "late" ? limit : allTypeLimit,
        }),
        prisma.studentRegistration.count({ where: lateWhere }),
      ]);
      
      allStudents = allStudents.concat(lateStudents.map(student => ({ ...student, registrationType: "late" } as const)));
      totalCount += lateCount;
    }
    
    // Query post students if needed
    if (shouldQueryPost) {
      const [postStudents, postCount] = await Promise.all([
        prisma.postRegistration.findMany({
          where: postWhere,
          include: {
            school: {
              select: {
                schoolName: true,
                schoolCode: true,
                lgaCode: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: registrationType === "post" ? skip : 0,
          take: registrationType === "post" ? limit : allTypeLimit,
        }),
        prisma.postRegistration.count({ where: postWhere }),
      ]);
      
      allStudents = allStudents.concat(postStudents.map(student => ({ ...student, registrationType: "post" } as const)));
      totalCount += postCount;
    }
    
    // Sort combined results by creation date (handle both Date objects and strings)
    allStudents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination if querying multiple types
    if (registrationType === "all" || !registrationType) {
      allStudents = allStudents.slice(skip, skip + limit);
    }
    
    // Fetch lCode from SchoolData for each student
    // Note: School.lgaCode contains the actual LGA code (lCode in SchoolData)
    const schoolDataMap = new Map<string, string>();
    const uniqueSchools = [...new Set(allStudents.map(s => `${s.school.lgaCode}-${s.school.schoolCode}`))];
    
    for (const schoolKey of uniqueSchools) {
      const [schoolLgaCode, schoolCode] = schoolKey.split('-');
      const normalizedSchoolCode = schoolCode.replace(/^0+/, "") || schoolCode;
      const schoolCodesToTry = Array.from(new Set([schoolCode, normalizedSchoolCode]));
      
      let resolvedSequentialLgaCode: string | null = null;

      for (const schCode of schoolCodesToTry) {
        const schoolData = await prisma.schoolData.findFirst({
          where: {
            schCode,
            OR: [{ lCode: schoolLgaCode }, { lgaCode: schoolLgaCode }],
          },
          select: {
            lgaCode: true,
          },
        });

        if (schoolData?.lgaCode) {
          resolvedSequentialLgaCode = schoolData.lgaCode;
          break;
        }
      }

      if (!resolvedSequentialLgaCode) {
        for (const schCode of schoolCodesToTry) {
          const fromJson = (schoolsData as SchoolDataJson[]).find(
            (s) =>
              (s.lCode === schoolLgaCode || s.lgaCode === schoolLgaCode) &&
              s.schCode === schCode
          );

          if (fromJson?.lgaCode) {
            resolvedSequentialLgaCode = String(fromJson.lgaCode);
            break;
          }
        }
      }

      if (resolvedSequentialLgaCode) {
        schoolDataMap.set(schoolKey, resolvedSequentialLgaCode);
      }
    }
    
    // Transform data for frontend
    const transformedStudents = allStudents.map(student => {
      const schoolKey = `${student.school.lgaCode}-${student.school.schoolCode}`;
      return {
        id: student.id,
        accCode: student.accCode,
        studentNumber: student.studentNumber,
        firstname: student.firstname,
        othername: student.othername,
        lastname: student.lastname,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        schoolType: student.schoolType,
        passport: student.passport,
        
        // English scores
        englishTerm1: student.englishTerm1,
        englishTerm2: student.englishTerm2,
        englishTerm3: student.englishTerm3,
        
        // Arithmetic scores
        arithmeticTerm1: student.arithmeticTerm1,
        arithmeticTerm2: student.arithmeticTerm2,
        arithmeticTerm3: student.arithmeticTerm3,
        
        // General Paper scores
        generalTerm1: student.generalTerm1,
        generalTerm2: student.generalTerm2,
        generalTerm3: student.generalTerm3,
        
        // Religious Studies
        religiousType: student.religiousType,
        religiousTerm1: student.religiousTerm1,
        religiousTerm2: student.religiousTerm2,
        religiousTerm3: student.religiousTerm3,
        
        // Dynamic subjects
        caScores: student.caScores,
        studentSubjects: student.studentSubjects,
        
        // Year and PRCD
        prcd: student.prcd,
        year: student.year,
        
        // Registration type
        registrationType: student.registrationType,
        
        // Additional info for filters
        lga: getLGAName(student.school.lgaCode),
        lgaCode: student.school.lgaCode,
        lCode: schoolDataMap.get(schoolKey) || "",
        schoolCode: student.school.schoolCode,
        schoolName: student.school.schoolName,
        date: student.createdAt.toISOString().split("T")[0],
      };
    });
    
    return NextResponse.json({
      data: transformedStudents,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error instanceof Error ? error.message : error);
    console.error("Stack:", error instanceof Error ? error.stack : "no stack");
    return NextResponse.json(
      { error: "Failed to fetch students", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
