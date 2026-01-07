"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has access token in cookies or localStorage
    const cookieToken = getCookie('accessToken');
    const localToken = localStorage.getItem("accessToken");
    const accessToken = cookieToken || localToken;
    
    if (!accessToken) {
      // Redirect to access page if no token
      router.push("/access");
    } else {
      setIsAuthenticated(true);
      
      // Sync: if we have cookie but not localStorage, update localStorage
      if (cookieToken && !localToken) {
        localStorage.setItem("accessToken", cookieToken);
        const schoolInfo = getCookie('schoolInfo');
        if (schoolInfo) {
          localStorage.setItem("schoolInfo", schoolInfo);
        }
      }
    }
    
    setIsChecking(false);
  }, [router]);

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
