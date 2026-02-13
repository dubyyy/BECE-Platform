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

  if (pathname === "/zuwa2") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/zuwa2";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/zuwa2/:path*", "/api/admin/:path*"]
};
