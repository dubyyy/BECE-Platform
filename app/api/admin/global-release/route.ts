import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const GLOBAL_RESULTS_RELEASE_KEY = "__GLOBAL_RESULTS_RELEASE__";

/**
 * POST /api/admin/global-release
 * Body: { released: boolean }
 * Globally release or unrelease all results across all 25 LGAs
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.MUTATION);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const body = await req.json();
    const { released } = body;

    if (typeof released !== "boolean") {
      return NextResponse.json(
        { error: "released must be a boolean value" },
        { status: 400 }
      );
    }

    // Update all results: released = unblocked (!blocked)
    // When released is true, we unblock (blocked = false)
    // When released is false, we block (blocked = true)
    const blocked = !released;

    await prisma.accessPin.upsert({
      where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
      update: { isActive: released },
      create: { pin: GLOBAL_RESULTS_RELEASE_KEY, isActive: released },
    });

    const updateResult = await prisma.result.updateMany({
      data: { blocked: blocked },
    });

    const action = released ? "released" : "unreleased";
    const message = `Successfully ${action} ${updateResult.count} results across all 25 LGAs`;

    return NextResponse.json({
      success: true,
      message: message,
      count: updateResult.count,
      released: released,
    });
  } catch (error) {
    console.error("Error updating global release status:", error);
    return NextResponse.json(
      {
        error: "Failed to update global release status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/global-release
 * Get the current global release status (checks if any results are blocked)
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitCheck = checkRateLimit(req, RATE_LIMITS.READ);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
  }

  try {
    const globalSetting = await prisma.accessPin.findUnique({
      where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
      select: { isActive: true },
    });

    const totalResults = await prisma.result.count();
    const blockedResults = await prisma.result.count({
      where: { blocked: true },
    });
    const releasedResults = totalResults - blockedResults;

    const globalReleased = globalSetting ? globalSetting.isActive : blockedResults === 0;

    return NextResponse.json({
      totalResults,
      blockedResults,
      releasedResults,
      allReleased: blockedResults === 0,
      allBlocked: releasedResults === 0,
      released: globalReleased,
    });
  } catch (error) {
    console.error("Error fetching global release status:", error);
    return NextResponse.json(
      { error: "Failed to fetch global release status" },
      { status: 500 }
    );
  }
}
