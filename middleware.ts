import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isVerified = req.cookies.get("admin_verified")?.value === "true";

  if (pathname === "/api/admin/verify-password" || pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  if (isVerified) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"]
};
