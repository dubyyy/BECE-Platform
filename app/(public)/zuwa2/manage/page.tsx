"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, FileText, Ban, CheckCircle2, School, MapPin, Filter, Church, Globe, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { LGA_MAPPING } from "@/lib/lga-mapping";

interface AdminResultsResponse {
  filters?: {
    lgaCodes?: string[];
  };
  results?: Array<{
    institutionCd?: string | null;
  }>;
  pagination?: {
    totalCount: number;
  };
}

type ResultClassificationPayload =
  | { rgstype: string; examinationNo: string }
  | { rgstype: string; institutionCd: string; lgaCd?: string }
  | { rgstype: string; lgaCd: string };

export default function ManagePage() {
  // Count and filter states
  const [resultsCount, setResultsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [lgaCodes, setLgaCodes] = useState<string[]>([]);
  const [schoolCodes, setSchoolCodes] = useState<string[]>([]);
  const [selectedLga, setSelectedLga] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  
  // Delete states
  const [deleteResultExam, setDeleteResultExam] = useState("");
  const [deleteResultLoading, setDeleteResultLoading] = useState(false);
  const [deleteSchoolCode, setDeleteSchoolCode] = useState("");
  const [deleteSchoolLga, setDeleteSchoolLga] = useState<string>("all");
  const [deleteSchoolLoading, setDeleteSchoolLoading] = useState(false);
  const [deleteLgaCode, setDeleteLgaCode] = useState("");
  const [deleteLgaLoading, setDeleteLgaLoading] = useState(false);
  
  // Block states
  const [blockResultExam, setBlockResultExam] = useState("");
  const [blockResultLoading, setBlockResultLoading] = useState(false);
  const [blockSchoolCode, setBlockSchoolCode] = useState("");
  const [blockSchoolLga, setBlockSchoolLga] = useState<string>("all");
  const [blockSchoolLoading, setBlockSchoolLoading] = useState(false);
  const [blockLgaCode, setBlockLgaCode] = useState("");
  const [blockLgaLoading, setBlockLgaLoading] = useState(false);
  
  // Religious classification states
  const [classificationSchoolCode, setClassificationSchoolCode] = useState("");
  const [classificationLga, setClassificationLga] = useState<string>("all");
  const [classificationLoading, setClassificationLoading] = useState(false);
  
  // Result religious classification states
  const [resultClassificationExam, setResultClassificationExam] = useState("");
  const [resultClassificationSchool, setResultClassificationSchool] = useState("");
  const [resultClassificationLga, setResultClassificationLga] = useState<string>("all");
  const [resultClassificationLoading, setResultClassificationLoading] = useState(false);
  const [resultClassificationType, setResultClassificationType] = useState<"exam" | "school" | "lga">("exam");
  
  // Global release states
  const [globalReleaseLoading, setGlobalReleaseLoading] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const resultsRes = await fetch("/api/admin/results?limit=1");
      if (resultsRes.ok) {
        const data: AdminResultsResponse = await resultsRes.json();
        if (data.filters) {
          setLgaCodes(data.filters.lgaCodes || []);
          
          const uniqueSchools = await fetch("/api/admin/results?limit=10000&page=1");
          if (uniqueSchools.ok) {
            const schoolsData: AdminResultsResponse = await uniqueSchools.json();
            const codes = [...new Set((schoolsData.results || []).map((r) => r.institutionCd))].filter(Boolean);
            setSchoolCodes(codes as string[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1" });
      if (selectedLga !== "all") {
        params.append("lgaCode", selectedLga);
      }
      if (selectedSchool !== "all") {
        params.append("institutionCd", selectedSchool);
      }

      const resultsRes = await fetch(`/api/admin/results?${params.toString()}`);
      if (resultsRes.ok) {
        const data: AdminResultsResponse = await resultsRes.json();
        setResultsCount(data.pagination?.totalCount ?? 0);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
      toast.error("Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  }, [selectedLga, selectedSchool]);

  useEffect(() => {
    fetchCounts();
    fetchFilterOptions();
  }, [fetchCounts, fetchFilterOptions]);

  useEffect(() => {
    fetchCounts();
  }, [selectedLga, selectedSchool, fetchCounts]);

  const handleDeleteResult = async () => {
    if (!deleteResultExam) {
      toast.error("Please enter an examination number");
      return;
    }

    setDeleteResultLoading(true);
    try {
      const res = await fetch(`/api/admin/results?examinationNo=${encodeURIComponent(deleteResultExam)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Result deleted successfully");
        setDeleteResultExam("");
        fetchCounts();
      } else {
        toast.error(data.error || "Failed to delete result");
      }
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error("An error occurred while deleting result");
    } finally {
      setDeleteResultLoading(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchoolCode) {
      toast.error("Please enter a school code");
      return;
    }

    setDeleteSchoolLoading(true);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "school", schoolCode: deleteSchoolCode }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "School results deleted successfully");
        setDeleteSchoolCode("");
        fetchCounts();
      } else {
        toast.error(data.error || "Failed to delete school results");
      }
    } catch (error) {
      console.error("Error deleting school results:", error);
      toast.error("An error occurred while deleting school results");
    } finally {
      setDeleteSchoolLoading(false);
    }
  };

  const handleDeleteLga = async () => {
    if (!deleteLgaCode) {
      toast.error("Please enter an LGA code");
      return;
    }

    setDeleteLgaLoading(true);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lga", lgaCode: deleteLgaCode }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "LGA results deleted successfully");
        setDeleteLgaCode("");
        fetchCounts();
      } else {
        toast.error(data.error || "Failed to delete LGA results");
      }
    } catch (error) {
      console.error("Error deleting LGA results:", error);
      toast.error("An error occurred while deleting LGA results");
    } finally {
      setDeleteLgaLoading(false);
    }
  };

  const handleBlockResult = async (blocked: boolean) => {
    if (!blockResultExam) {
      toast.error("Please enter an examination number");
      return;
    }

    setBlockResultLoading(true);
    try {
      const res = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "student", examNumber: blockResultExam, blocked }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Result ${blocked ? "blocked" : "unblocked"} successfully`);
        setBlockResultExam("");
      } else {
        toast.error(data.error || "Failed to update result block status");
      }
    } catch (error) {
      console.error("Error updating result block status:", error);
      toast.error("An error occurred while updating result block status");
    } finally {
      setBlockResultLoading(false);
    }
  };

  const handleBlockSchool = async (blocked: boolean) => {
    if (!blockSchoolCode) {
      toast.error("Please enter a school code");
      return;
    }

    setBlockSchoolLoading(true);
    try {
      const res = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "school", schoolCode: blockSchoolCode, blocked }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `School ${blocked ? "blocked" : "unblocked"} successfully`);
        setBlockSchoolCode("");
      } else {
        toast.error(data.error || "Failed to update school block status");
      }
    } catch (error) {
      console.error("Error updating school block status:", error);
      toast.error("An error occurred while updating school block status");
    } finally {
      setBlockSchoolLoading(false);
    }
  };

  const handleBlockLga = async (blocked: boolean) => {
    if (!blockLgaCode) {
      toast.error("Please enter an LGA code");
      return;
    }

    setBlockLgaLoading(true);
    try {
      const res = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lga", lgaCode: blockLgaCode, blocked }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `LGA ${blocked ? "blocked" : "unblocked"} successfully`);
        setBlockLgaCode("");
      } else {
        toast.error(data.error || "Failed to update LGA block status");
      }
    } catch (error) {
      console.error("Error updating LGA block status:", error);
      toast.error("An error occurred while updating LGA block status");
    } finally {
      setBlockLgaLoading(false);
    }
  };

  const handleUpdateClassification = async (classification: string) => {
    if (!classificationSchoolCode) {
      toast.error("Please enter a school code");
      return;
    }

    setClassificationLoading(true);
    try {
      const res = await fetch("/api/admin/school-classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolCode: classificationSchoolCode, classification }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `School classification updated to ${classification}`);
        setClassificationSchoolCode("");
      } else {
        toast.error(data.error || "Failed to update classification");
      }
    } catch (error) {
      console.error("Error updating classification:", error);
      toast.error("An error occurred while updating classification");
    } finally {
      setClassificationLoading(false);
    }
  };

  const handleUpdateResultClassification = async (rgstype: string) => {
    if (resultClassificationType === "exam" && !resultClassificationExam) {
      toast.error("Please enter an examination number");
      return;
    }
    if (resultClassificationType === "school" && !resultClassificationSchool) {
      toast.error("Please enter a school code");
      return;
    }
    if (resultClassificationType === "lga" && resultClassificationLga === "all") {
      toast.error("Please select an LGA");
      return;
    }

    setResultClassificationLoading(true);
    try {
      let payload: ResultClassificationPayload;
      
      if (resultClassificationType === "exam") {
        payload = { rgstype, examinationNo: resultClassificationExam };
      } else if (resultClassificationType === "school") {
        payload = {
          rgstype,
          institutionCd: resultClassificationSchool,
          ...(resultClassificationLga !== "all" ? { lgaCd: resultClassificationLga } : {}),
        };
      } else if (resultClassificationType === "lga") {
        payload = { rgstype, lgaCd: resultClassificationLga };
      } else {
        payload = { rgstype, lgaCd: resultClassificationLga };
      }

      const res = await fetch("/api/admin/result-classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Result(s) classification updated to ${rgstype}`);
        setResultClassificationExam("");
        setResultClassificationSchool("");
        setResultClassificationLga("all");
      } else {
        toast.error(data.error || "Failed to update result classification");
      }
    } catch (error) {
      console.error("Error updating result classification:", error);
      toast.error("An error occurred while updating result classification");
    } finally {
      setResultClassificationLoading(false);
    }
  };

  const handleGlobalRelease = async (released: boolean) => {
    setGlobalReleaseLoading(true);
    try {
      const res = await fetch("/api/admin/global-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ released }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Results ${released ? "released" : "unreleased"} across all 25 LGAs`);
        fetchCounts();
      } else {
        toast.error(data.error || "Failed to update global release status");
      }
    } catch (error) {
      console.error("Error updating global release status:", error);
      toast.error("An error occurred while updating global release status");
    } finally {
      setGlobalReleaseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Results Management</h2>
        <p className="text-muted-foreground mt-1">
          Count, delete, and block results by LGA, school, or student
        </p>
      </div>

      {/* Count Section with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Count Results</CardTitle>
          <CardDescription>View total results with optional filtering by LGA and School</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Filter by LGA</Label>
                <Select value={selectedLga} onValueChange={setSelectedLga}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select LGA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All LGAs</SelectItem>
                    {lgaCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {LGA_MAPPING[code] || code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by School Code</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select School Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schoolCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedLga !== "all" || selectedSchool !== "all") && (
              <Button 
                onClick={() => {
                  setSelectedLga("all");
                  setSelectedSchool("all");
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results Display */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Results Count
              {(selectedLga !== "all" || selectedSchool !== "all") && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (Filtered)
                </span>
              )}
            </h3>
            <p className="text-2xl font-bold">{loading ? "Loading..." : resultsCount} Total Results</p>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLga !== "all" && `LGA: ${selectedLga}`}
              {selectedLga !== "all" && selectedSchool !== "all" && " • "}
              {selectedSchool !== "all" && `School: ${selectedSchool}`}
              {selectedLga === "all" && selectedSchool === "all" && "All student examination results in database"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Delete Operations</CardTitle>
          <CardDescription>Permanently delete results by student, school, or LGA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delete Student Result */}
          <div className="space-y-3">
            <Label htmlFor="delete-result" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Delete Student Result
            </Label>
            <div className="flex gap-2">
              <Input
                id="delete-result"
                placeholder="Enter Examination Number"
                value={deleteResultExam}
                onChange={(e) => setDeleteResultExam(e.target.value)}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!deleteResultExam || deleteResultLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteResultLoading ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Student Result</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the student result from the database.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteResult} className="bg-destructive text-destructive-foreground">
                      Delete Result
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Delete School Results */}
          <div className="space-y-3">
            <Label htmlFor="delete-school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Delete School Results
            </Label>
            <div className="flex gap-2">
              <Select value={deleteSchoolLga} onValueChange={setDeleteSchoolLga}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {lgaCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {LGA_MAPPING[code] || code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="delete-school"
                placeholder="Enter School Code"
                value={deleteSchoolCode}
                onChange={(e) => setDeleteSchoolCode(e.target.value)}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!deleteSchoolCode || deleteSchoolLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteSchoolLoading ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete School Results</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL results for this school.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSchool} className="bg-destructive text-destructive-foreground">
                      Delete School Results
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Delete LGA Results */}
          <div className="space-y-3">
            <Label htmlFor="delete-lga" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delete LGA Results
            </Label>
            <div className="flex gap-2">
              <Input
                id="delete-lga"
                placeholder="Enter LGA Code"
                value={deleteLgaCode}
                onChange={(e) => setDeleteLgaCode(e.target.value)}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!deleteLgaCode || deleteLgaLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteLgaLoading ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete LGA Results</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL results for this LGA.
                      This is a CRITICAL action that cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteLga} className="bg-destructive text-destructive-foreground">
                      Delete LGA Results
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Block/Unblock Operations</CardTitle>
          <CardDescription>Block or unblock access to results by student, school, or LGA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Block Student Result */}
          <div className="space-y-3">
            <Label htmlFor="block-result" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Block/Unblock Student Result
            </Label>
            <div className="flex gap-2">
              <Input
                id="block-result"
                placeholder="Enter Examination Number"
                value={blockResultExam}
                onChange={(e) => setBlockResultExam(e.target.value)}
              />
              <Button 
                variant="destructive" 
                disabled={!blockResultExam || blockResultLoading}
                onClick={() => handleBlockResult(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                {blockResultLoading ? "Processing..." : "Block"}
              </Button>
              <Button 
                variant="default" 
                disabled={!blockResultExam || blockResultLoading}
                onClick={() => handleBlockResult(false)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Unblock
              </Button>
            </div>
          </div>

          {/* Block School Results */}
          <div className="space-y-3">
            <Label htmlFor="block-school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Block/Unblock School Results
            </Label>
            <div className="flex gap-2">
              <Select value={blockSchoolLga} onValueChange={setBlockSchoolLga}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {lgaCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {LGA_MAPPING[code] || code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="block-school"
                placeholder="Enter School Code"
                value={blockSchoolCode}
                onChange={(e) => setBlockSchoolCode(e.target.value)}
              />
              <Button 
                variant="destructive" 
                disabled={!blockSchoolCode || blockSchoolLoading}
                onClick={() => handleBlockSchool(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                {blockSchoolLoading ? "Processing..." : "Block"}
              </Button>
              <Button 
                variant="default" 
                disabled={!blockSchoolCode || blockSchoolLoading}
                onClick={() => handleBlockSchool(false)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Unblock
              </Button>
            </div>
          </div>

          {/* Block LGA Results */}
          <div className="space-y-3">
            <Label htmlFor="block-lga" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Block/Unblock LGA Results
            </Label>
            <div className="flex gap-2">
              <Input
                id="block-lga"
                placeholder="Enter LGA Code"
                value={blockLgaCode}
                onChange={(e) => setBlockLgaCode(e.target.value)}
              />
              <Button 
                variant="destructive" 
                disabled={!blockLgaCode || blockLgaLoading}
                onClick={() => handleBlockLga(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                {blockLgaLoading ? "Processing..." : "Block"}
              </Button>
              <Button 
                variant="default" 
                disabled={!blockLgaCode || blockLgaLoading}
                onClick={() => handleBlockLga(false)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Unblock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Religious Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Religious Classification</CardTitle>
          <CardDescription>Update religious classification for schools and results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* School Classification */}
          <div className="space-y-3">
            <Label htmlFor="classification-school" className="flex items-center gap-2">
              <Church className="h-4 w-4" />
              Update School Classification (Christian/Muslim)
            </Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={classificationLga} onValueChange={setClassificationLga}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {lgaCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {LGA_MAPPING[code] || code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="classification-school"
                placeholder="Enter School Code"
                value={classificationSchoolCode}
                onChange={(e) => setClassificationSchoolCode(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Button 
                variant="default" 
                disabled={!classificationSchoolCode || classificationLoading}
                onClick={() => handleUpdateClassification("Christian")}
              >
                <Church className="h-4 w-4 mr-2" />
                {classificationLoading ? "Processing..." : "Christian"}
              </Button>
              <Button 
                variant="secondary" 
                disabled={!classificationSchoolCode || classificationLoading}
                onClick={() => handleUpdateClassification("Muslim")}
              >
                <Church className="h-4 w-4 mr-2" />
                Muslim
              </Button>
            </div>
          </div>

          {/* Result Religious Classification */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Update Result Religious Type (IRS/CRS)
            </Label>
            
            {/* Classification Type Selector */}
            <div className="flex gap-2">
              <Button
                variant={resultClassificationType === "exam" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultClassificationType("exam")}
              >
                By Exam No.
              </Button>
              <Button
                variant={resultClassificationType === "school" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultClassificationType("school")}
              >
                By School
              </Button>
              <Button
                variant={resultClassificationType === "lga" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultClassificationType("lga")}
              >
                By LGA
              </Button>
            </div>

            {/* Input Fields Based on Type */}
            <div className="flex gap-2 flex-wrap">
              {resultClassificationType === "exam" && (
                <Input
                  placeholder="Enter Examination Number"
                  value={resultClassificationExam}
                  onChange={(e) => setResultClassificationExam(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
              )}
              
              {resultClassificationType === "school" && (
                <>
                  <Select value={resultClassificationLga} onValueChange={setResultClassificationLga}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select LGA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All LGAs</SelectItem>
                      {lgaCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {LGA_MAPPING[code] || code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter School Code"
                    value={resultClassificationSchool}
                    onChange={(e) => setResultClassificationSchool(e.target.value)}
                    className="flex-1 min-w-[200px]"
                  />
                </>
              )}
              
              {resultClassificationType === "lga" && (
                <Select value={resultClassificationLga} onValueChange={setResultClassificationLga}>
                  <SelectTrigger className="flex-1 min-w-[200px]">
                    <SelectValue placeholder="Select LGA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select LGA</SelectItem>
                    {lgaCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {LGA_MAPPING[code] || code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button 
                variant="default" 
                disabled={resultClassificationLoading}
                onClick={() => handleUpdateResultClassification("CRS")}
              >
                <Church className="h-4 w-4 mr-2" />
                {resultClassificationLoading ? "Processing..." : "CRS"}
              </Button>
              <Button 
                variant="secondary" 
                disabled={resultClassificationLoading}
                onClick={() => handleUpdateResultClassification("IRS")}
              >
                <Church className="h-4 w-4 mr-2" />
                IRS
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              CRS = Christian Religious Studies, IRS = Islamic Religious Studies
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Release Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Global Result Release</CardTitle>
          <CardDescription>
            Control result access across all 25 LGAs at once. Released results are accessible to all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global Controls
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use these controls to release or unrelease results for all LGAs simultaneously.
              This affects result visibility across the entire system.
            </p>
            <div className="flex gap-2 flex-wrap">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="default" 
                    disabled={globalReleaseLoading}
                    className="flex-1 min-w-[150px]"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    {globalReleaseLoading ? "Processing..." : "Release All Results"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Release Results for All 25 LGAs</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make ALL results accessible across all 25 LGAs.
                      Users will be able to view their examination results.
                      Are you sure you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleGlobalRelease(true)}>
                      Release All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={globalReleaseLoading}
                    className="flex-1 min-w-[150px]"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Unrelease All Results
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unrelease Results for All 25 LGAs</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will DENY access to ALL results across all 25 LGAs.
                      Users will NOT be able to view their examination results.
                      This is a CRITICAL action. Are you sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleGlobalRelease(false)}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Unrelease All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
