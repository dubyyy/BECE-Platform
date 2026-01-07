"use client"

import { SessionProvider } from "next-auth/react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}

function AdminHeader() {
  const { data: session } = useSession();
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        {session && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user?.email}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}