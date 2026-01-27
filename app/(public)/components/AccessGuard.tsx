"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isChecking = typeof window === "undefined";
  const cookieToken = !isChecking ? getCookie("accessToken") : null;
  const localToken = !isChecking ? localStorage.getItem("accessToken") : null;
  const accessToken = cookieToken || localToken;
  const isAuthenticated = Boolean(accessToken);

  useEffect(() => {
    if (!accessToken) {
      // Redirect to access page if no token
      router.push("/access");
    } else {
      // Sync: if we have cookie but not localStorage, update localStorage
      if (cookieToken && !localToken) {
        localStorage.setItem("accessToken", cookieToken);
        const schoolInfo = getCookie("schoolInfo");
        if (schoolInfo) {
          localStorage.setItem("schoolInfo", schoolInfo);
        }
      }
    }
  }, [router, accessToken, cookieToken, localToken]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
