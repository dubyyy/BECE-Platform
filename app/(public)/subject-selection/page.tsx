"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Subject list with codes for secondary school
const SUBJECTS = [
  { code: "ENG", name: "English Language" },
  { code: "MTH", name: "Mathematics" },
  { code: "BST", name: "Basic Science and Technology" },
  { code: "RGS", name: "Religious Studies" },
  { code: "HST", name: "Historical Studies" },
  { code: "ARB", name: "Arabic Studies" },
  { code: "CCA", name: "Cultural and Creative Arts" },
  { code: "FRE", name: "French" },
  { code: "NVS", name: "National Values" },
  { code: "PVS", name: "Pre Vocational Studies" },
  { code: "BUS", name: "Business Studies" },
];

export default function SubjectSelectionPage() {
  const router = useRouter();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("selectedSubjects");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSelectedSubjects(parsed);
    } catch {
      // ignore parse errors
    }
  }, []);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubjectToggle = (code: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === SUBJECTS.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(SUBJECTS.map((s) => s.code));
    }
  };

  const handleContinue = () => {
    if (selectedSubjects.length === 0) return;
    
    setIsNavigating(true);
    
    // Store selected subjects in sessionStorage for persistence
    sessionStorage.setItem("selectedSubjects", JSON.stringify(selectedSubjects));
    
    // Navigate to school registration
    router.push("/school-registration");
  };

  const isValid = selectedSubjects.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 xl:px-8 2xl:px-12">
        <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Subject Selection</CardTitle>
                  <CardDescription>
                    Select the subjects for the Basic Education Certificate Examination (BECE)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Instructions */}
              <div className="mb-6 p-4 bg-accent rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  Please select at least one subject to proceed with school registration. 
                  These subjects will be used for student examination registration.
                </p>
              </div>

              {/* Select All Option */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedSubjects.length === SUBJECTS.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium cursor-pointer">
                    Select All Subjects
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedSubjects.length} of {SUBJECTS.length} selected
                </span>
              </div>

              {/* Subject Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUBJECTS.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject.code);
                  return (
                    <div
                      key={subject.code}
                      className={`
                        relative flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                        }
                      `}
                      onClick={() => handleSubjectToggle(subject.code)}
                    >
                      <Checkbox
                        id={subject.code}
                        checked={isSelected}
                        onCheckedChange={() => handleSubjectToggle(subject.code)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <Label 
                          htmlFor={subject.code} 
                          className="font-medium cursor-pointer block"
                        >
                          {subject.name}
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({subject.code})
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Validation Message */}
              {!isValid && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Please select at least one subject to continue with registration.
                  </p>
                </div>
              )}

              {/* Continue Button */}
              <div className="mt-8 pt-6 border-t border-border">
                <Button
                  onClick={handleContinue}
                  disabled={!isValid || isNavigating}
                  className="w-full"
                  size="lg"
                >
                  {isNavigating ? (
                    "Proceeding..."
                  ) : (
                    <>
                      Continue to Registration
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                {isValid && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected for registration
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Subjects Summary */}
          {selectedSubjects.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Selected Subjects Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {selectedSubjects.map((code) => {
                    const subject = SUBJECTS.find((s) => s.code === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        <span>{subject?.name}</span>
                        <span className="text-xs opacity-70">({code})</span>
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
