import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLGAName, getLGACode } from "@/lib/lga-mapping";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import schoolsData from "@/data.json";

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
    
    // Build where clause for StudentRegistration
    const studentWhere: any = {};
    
    // Search by name or student number
    if (search) {
      studentWhere.OR = [
        {
          firstname: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastname: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          studentNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }
    
    // Filter by LGA
    if (lga && lga !== "all") {
      // Convert LGA name to code (frontend sends names, backend uses codes)
      const lgaCode = getLGACode(lga);
      if (lgaCode) {
        studentWhere.school = {
          lgaCode: lgaCode,
        };
      }
    }
    
    // Filter by school code
    if (schoolCode && schoolCode !== "all") {
      studentWhere.school = {
        ...studentWhere.school,
        schoolCode: schoolCode,
      };
    }
    
    // Determine which tables/types to query based on registration type filter
    const shouldQueryRegular = !registrationType || registrationType === "all" || registrationType === "regular";
    const shouldQueryLate = !registrationType || registrationType === "all" || registrationType === "late";
    const shouldQueryPost = !registrationType || registrationType === "all" || registrationType === "post";
    
    let allStudents: any[] = [];
    let totalCount = 0;
    
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
          take: registrationType === "regular" ? limit : undefined,
        }),
        prisma.studentRegistration.count({ where: regularWhere }),
      ]);
      
      allStudents = allStudents.concat(regularStudents.map(student => ({ ...student, registrationType: "regular" })));
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
          take: registrationType === "late" ? limit : undefined,
        }),
        prisma.studentRegistration.count({ where: lateWhere }),
      ]);
      
      allStudents = allStudents.concat(lateStudents.map(student => ({ ...student, registrationType: "late" })));
      totalCount += lateCount;
    }
    
    // Query post students if needed
    if (shouldQueryPost) {
      // Use the same where clause structure for PostRegistration
      const postWhere = { ...studentWhere };
      
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
          take: registrationType === "post" ? limit : undefined,
        }),
        prisma.postRegistration.count({ where: postWhere }),
      ]);
      
      allStudents = allStudents.concat(postStudents.map(student => ({ ...student, registrationType: "post" })));
      totalCount += postCount;
    }
    
    // Sort combined results by creation date
    allStudents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
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
          const fromJson = (schoolsData as any[]).find(
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
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
