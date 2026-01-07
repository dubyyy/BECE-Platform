"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { deleteAllAuthCookies } from "@/lib/cookies";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear access token and school info from both cookies and localStorage
    deleteAllAuthCookies();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("schoolInfo");
    
    // Redirect to access page
    router.push("/access");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="gap-2 text-blue-950 cursor-pointer"

    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
}
