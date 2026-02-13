"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Lock, Loader2, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CIEAuthOption = {
  lgaCode: string;
  lgaName: string;
  lCodes: string[];
};

const STORAGE_KEY = "cieAuthToken";

export default function CIEAuthGate({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [options, setOptions] = useState<CIEAuthOption[]>([]);
  const [selectedLgaCode, setSelectedLgaCode] = useState<string>("");
  const [selectedICode, setSelectedICode] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const selectedLga = useMemo(
    () => options.find((o) => o.lgaCode === selectedLgaCode) || null,
    [options, selectedLgaCode]
  );

  useEffect(() => {
    const run = async () => {
      try {
        const savedToken = localStorage.getItem(STORAGE_KEY);
        if (savedToken) {
          const res = await fetch("/api/cie/students", {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });
          if (res.ok) {
            setIsAuthorized(true);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        const res = await fetch("/api/cie/auth-options");
        if (res.ok) {
          const json = await res.json();
          setOptions(json.data ?? []);
        }
      } catch {
        // noop
      } finally {
        setIsChecking(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    if (!selectedLga) {
      setSelectedICode("");
    }
  }, [selectedLga]);

  const handleContinue = async () => {
    if (!selectedLgaCode || !selectedICode) return;

    setIsAuthenticating(true);

    try {
      const res = await fetch("/api/cie/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lgaCode: selectedLgaCode,
          icode: selectedICode,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setIsAuthorized(true);
        toast.success("Authentication successful");
      } else {
        toast.error(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="relative h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verifying secure access...</span>
        </div>
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-2">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Inspector Portal</h1>
            <p className="text-muted-foreground text-sm mt-2 font-medium">Ministry of Basic & Secondary Education</p>
          </div>
        </div>

        <Card className="border shadow-lg">
          <CardContent className="pt-8 pb-8 px-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Local Government Area
                </label>
                <Select value={selectedLgaCode} onValueChange={setSelectedLgaCode}>
                  <SelectTrigger className="h-12">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select Local Government Area" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {options.filter((o) => o.lgaCode).map((o) => (
                      <SelectItem key={o.lgaCode} value={o.lgaCode}>
                        {o.lgaName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Inspector Code (iCode)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="password"
                    placeholder="Enter Inspector Code"
                    className="pl-10 h-12"
                    value={selectedICode}
                    onChange={(e) => setSelectedICode(e.target.value)}
                    disabled={!selectedLga}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                className={cn("w-full h-12 text-base font-semibold")}
                onClick={handleContinue}
                disabled={!selectedLgaCode || !selectedICode || isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    Access Portal <ChevronRight className="h-4 w-4 opacity-70" />
                  </span>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-6">
                Protected Area. Unauthorized access is a punishable offense.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
