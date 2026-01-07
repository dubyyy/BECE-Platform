import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    const adminPassword = process.env.ADMIN_PASSWORD || "zuwa2";
    
    if (password === adminPassword) {
      // Set a secure cookie that expires in 24 hours
      const cookieStore = await cookies();
      cookieStore.set("admin_verified", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { success: false, message: "Invalid password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Admin password verification error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminVerified = cookieStore.get("admin_verified");
    
    return NextResponse.json({ verified: adminVerified?.value === "true" });
  } catch (error) {
    console.error("Admin verification check error:", error);
    return NextResponse.json({ verified: false }, { status: 500 });
  }
}
