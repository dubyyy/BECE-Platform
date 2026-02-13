"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface School {
  id: string;
  lgaCode: string;
  schoolCode: string;
  schoolName: string;
  registrationOpen: boolean;
}

export default function Settings() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalRegistrationOpen, setGlobalRegistrationOpen] = useState(true);
  const [togglingGlobal, setTogglingGlobal] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/admin/toggle-registration');
      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
        // Set global state based on if all schools are open
        const allOpen = data.schools.every((s: School) => s.registrationOpen);
        setGlobalRegistrationOpen(allOpen);
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to load registration status');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = async (checked: boolean) => {
    setTogglingGlobal(true);
    try {
      const response = await fetch('/api/admin/toggle-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleAll: true, registrationOpen: checked }),
      });

      if (response.ok) {
        setGlobalRegistrationOpen(checked);
        await fetchSchools(); // Refresh the list
        toast.success(
          checked
            ? 'Registration opened for all schools'
            : 'Registration closed for all schools. New students will be marked as LATE.'
        );
      } else {
        toast.error('Failed to toggle registration status');
      }
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast.error('An error occurred');
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleSchoolToggle = async (schoolId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/toggle-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, registrationOpen: !currentStatus }),
      });

      if (response.ok) {
        await fetchSchools(); // Refresh the list
        toast.success(
          !currentStatus
            ? 'Registration opened for school'
            : 'Registration closed. New students will be marked as LATE.'
        );
      } else {
        toast.error('Failed to toggle registration status');
      }
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast.error('An error occurred');
    }
  };

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage system settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Registration Control</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Control student registration system-wide. When OFF, new students are automatically marked as LATE registrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Global Toggle */}
          <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base sm:text-lg font-semibold">Global Registration Status</Label>
                  {togglingGlobal && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {globalRegistrationOpen 
                    ? 'Registration is currently OPEN for all schools'
                    : 'Registration is currently CLOSED for all schools. New students will be marked as LATE.'}
                </p>
              </div>
              <Switch 
                checked={globalRegistrationOpen}
                onCheckedChange={handleGlobalToggle}
                disabled={togglingGlobal}
                className="shrink-0" 
              />
            </div>
          </div>

          {/* Individual School Status */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Individual School Controls</Label>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {schools.map((school) => (
                  <div key={school.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{school.schoolName}</p>
                          {school.registrationOpen ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          LGA: {school.lgaCode} | Code: {school.schoolCode}
                        </p>
                      </div>
                      <Switch 
                        checked={school.registrationOpen}
                        onCheckedChange={() => handleSchoolToggle(school.id, school.registrationOpen)}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Notification Settings</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configure email notifications for system events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">New Registration Alerts</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Receive notifications when students register
              </p>
            </div>
            <Switch defaultChecked className="shrink-0" />
          </div>

          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Daily Summary Reports</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Get daily summaries of registration activities
              </p>
            </div>
            <Switch defaultChecked className="shrink-0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-sm sm:text-base">Admin Email</Label>
            <Input id="admin-email" type="email" placeholder="admin@example.com" className="text-sm sm:text-base" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">System Preferences</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Customize your admin dashboard experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="system-name" className="text-sm sm:text-base">System Name</Label>
            <Input id="system-name" defaultValue="Student Registration System" className="text-sm sm:text-base" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic-year" className="text-sm sm:text-base">Current Academic Year</Label>
            <Input id="academic-year" defaultValue="2024/2025" className="text-sm sm:text-base" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="w-full sm:w-auto">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
