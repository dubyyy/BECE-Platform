"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Eye,
  EyeOff,
} from "lucide-react";
import { setCookie, getCookie } from "@/lib/cookies";
import Link from "next/link";
import Image from "next/image";

export default function AccessPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    lgaCode: "",
    schoolCode: "",
    accessPin: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const token = getCookie("accessToken");
    setAccessToken(token);
  }, []);

  const isChecking = !isMounted;
  const isRedirecting = Boolean(accessToken);

  // Check if user is already authenticated
  useEffect(() => {
    if (accessToken) {
      router.push("/portal");
    }
  }, [router, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/access/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      setCookie('accessToken', data.token, 7);
      setCookie('schoolInfo', JSON.stringify(data.school), 7);
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("schoolInfo", JSON.stringify(data.school));

      router.push("/portal");
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isChecking || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3 xl:px-8 2xl:px-12 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-10 flex-shrink-0">
              <Image src="/delta-logo.png" alt="Delta State Government Seal" fill className="object-contain" priority />
            </div>
            <div className="border-l border-primary-foreground/30 pl-3">
              <p className="text-xs font-medium tracking-wide uppercase opacity-90">Delta State Government</p>
              <p className="text-sm font-semibold">Ministry of secondary education</p>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-primary-foreground/20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 xl:p-12">
        <div className="w-full max-w-md xl:max-w-lg">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">
                School Administration Portal
              </CardTitle>
              <CardDescription>
                Authorized personnel access only. Enter your credentials to proceed.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* LGA Code Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="lga_code" className="text-sm font-medium">
                    LGA Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lga_code"
                    type="text"
                    placeholder="Enter LGA code"
                    value={formData.lgaCode}
                    onChange={(e) =>
                      setFormData({ ...formData, lgaCode: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* School Code Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="school_code" className="text-sm font-medium">
                    School Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="school_code"
                    type="text"
                    placeholder="Enter school code"
                    value={formData.schoolCode}
                    onChange={(e) =>
                      setFormData({ ...formData, schoolCode: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Access PIN Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="access_pin" className="text-sm font-medium">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="access_pin"
                      type={showPin ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.accessPin}
                      onChange={(e) =>
                        setFormData({ ...formData, accessPin: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      VERIFYING CREDENTIALS...
                    </>
                  ) : (
                    "PROCEED TO PORTAL"
                  )}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-border">
                <Link href="/" className="text-sm text-primary hover:underline underline-offset-2">
                  ← Return to main portal
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
            This is a restricted access portal. Unauthorized access attempts are logged and may be subject to legal action.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 xl:px-8 2xl:px-12 text-center text-xs opacity-80 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
          &copy; {new Date().getFullYear()} Delta State Government, Ministry of secondary education
        </div>
      </footer>
    </div>
  );
}
