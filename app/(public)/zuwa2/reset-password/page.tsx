"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { LGA_MAPPING } from "@/lib/lga-mapping";

export default function ResetPassword() {
  const [lgaCode, setLgaCode] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!lgaCode || !schoolCode || !newPassword || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lgaCode,
          schoolCode,
          newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Password reset successfully");
        toast.info(`School: ${data.school.schoolName}`);
        
        // Clear form
        setLgaCode("");
        setSchoolCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Reset School Password
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Reset the password for a school using LGA and school code
        </p>
      </div>

      {/* Reset Password Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
            Password Reset
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Select the LGA, enter the school code, and set the new password
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lgaCode">LGA</Label>
              <Select
                value={lgaCode}
                onValueChange={setLgaCode}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LGA_MAPPING).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the Local Government Area for the school
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolCode">School Code</Label>
              <Input
                id="schoolCode"
                type="text"
                placeholder="e.g., SCH001"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the unique school code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="max-w-2xl bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>The school must be registered in the system</li>
            <li>Both LGA and school code must match exactly</li>
            <li>Password must be at least 6 characters long</li>
            <li>The new password will be encrypted before storage</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
