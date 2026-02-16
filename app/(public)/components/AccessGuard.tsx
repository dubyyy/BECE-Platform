"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const cookieToken = getCookie("accessToken");
    const localToken = localStorage.getItem("accessToken");
    const token = cookieToken || localToken;
    setAccessToken(token);

    // Sync: if we have cookie but not localStorage, update localStorage
    if (cookieToken && !localToken) {
      localStorage.setItem("accessToken", cookieToken);
      const schoolInfo = getCookie("schoolInfo");
      if (schoolInfo) {
        localStorage.setItem("schoolInfo", schoolInfo);
      }
    }
  }, []);

  const isChecking = !isMounted;
  const isAuthenticated = Boolean(accessToken);

  useEffect(() => {
    if (isMounted && !accessToken) {
      router.push("/access");
    }
  }, [router, accessToken, isMounted]);

  // Show loading state while checking authentication
  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
