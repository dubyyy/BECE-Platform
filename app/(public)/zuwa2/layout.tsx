"use client";

import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminPasswordPrompt } from "@/components/AdminPasswordPrompt";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkVerification() {
      try {
        const res = await fetch("/api/admin/verify-password");
        const data = await res.json();
        setIsVerified(data.verified === true);
      } catch {
        setIsVerified(false);
      } finally {
        setChecking(false);
      }
    }
    checkVerification();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!isVerified) {
    return <AdminPasswordPrompt onVerified={() => setIsVerified(true)} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 md:h-16 xl:h-18 border-b border-border bg-card flex items-center px-3 sm:px-4 md:px-6 xl:px-8 2xl:px-10 sticky top-0 z-10">
            <SidebarTrigger className="mr-2 md:mr-4" />
            <h1 className="text-sm sm:text-base md:text-xl xl:text-2xl font-semibold text-foreground truncate">
              Student Registration System
            </h1>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 xl:p-8 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
