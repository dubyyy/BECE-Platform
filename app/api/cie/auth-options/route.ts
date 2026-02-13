import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LGA_MAPPING } from "@/lib/lga-mapping";

export async function GET() {
  try {
    // Get all unique LGA codes from SchoolData table
    const schoolDataEntries = await prisma.schoolData.findMany({
      select: {
        lgaCode: true,
        lCode: true,
      },
    });

    // Group by lgaCode and collect unique lCodes
    const byLgaCode = new Map<
      string,
      { lgaCode: string; lCodes: Set<string> }
    >();

    for (const s of schoolDataEntries) {
      if (!s.lgaCode || !s.lCode) continue;
      const current = byLgaCode.get(s.lgaCode);
      if (!current) {
        byLgaCode.set(s.lgaCode, { lgaCode: s.lgaCode, lCodes: new Set([s.lCode]) });
      } else {
        current.lCodes.add(s.lCode);
      }
    }

    const data = [...byLgaCode.values()]
      .map((v) => {
        const lCodes = [...v.lCodes.values()].sort((a, b) => a.localeCompare(b));
        const primaryLCode = lCodes[0] || "";

        return {
          lgaCode: v.lgaCode,
          lgaName: LGA_MAPPING[primaryLCode] || v.lgaCode,
          lCodes,
        };
      })
      .sort((a, b) => a.lgaName.localeCompare(b.lgaName));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error building CIE auth options:", error);
    return NextResponse.json(
      { error: "Failed to build auth options" },
      { status: 500 }
    );
  }
}
