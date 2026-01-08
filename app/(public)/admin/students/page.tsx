"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { LGA_MAPPING, getLGACode } from "@/lib/lga-mapping";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface Student {
  id: string;
  accCode: string;
  studentNumber: string;
  firstname: string;
  othername: string | null;
  lastname: string;
  dateOfBirth: string | null;
  gender: string;
  schoolType: string;
  passport: string | null;
  
  // English scores
  englishTerm1: string | null;
  englishTerm2: string | null;
  englishTerm3: string | null;
  
  // Arithmetic scores
  arithmeticTerm1: string | null;
  arithmeticTerm2: string | null;
  arithmeticTerm3: string | null;
  
  // General Paper scores
  generalTerm1: string | null;
  generalTerm2: string | null;
  generalTerm3: string | null;
  
  // Religious Studies
  religiousType: string | null;
  religiousTerm1: string | null;
  religiousTerm2: string | null;
  religiousTerm3: string | null;
  
  // Additional info
  lga: string;
  lgaCode?: string;
  lCode?: string;
  schoolCode: string;
  schoolName: string;
  date: string;
  prcd?: number;
  year?: string;
  registrationType?: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLGA, setSelectedLGA] = useState("all");
  const [schoolCodeInput, setSchoolCodeInput] = useState("");
  const [registrationType, setRegistrationType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Ensure students is always an array
  const safeStudents = Array.isArray(students) ? students : [];
  
  // All LGAs in Delta State from the mapping
  const allLGAs = Object.values(LGA_MAPPING).sort();

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedLGA, schoolCodeInput, registrationType]);

  async function fetchStudents() {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedLGA && selectedLGA !== "all") params.append("lga", selectedLGA);
      if (schoolCodeInput) params.append("schoolCode", schoolCodeInput);
      if (registrationType && registrationType !== "all") params.append("registrationType", registrationType);

      const response = await fetch(`/api/admin/students?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        // Ensure we always set an array
        if (result && Array.isArray(result.data)) {
          // Double-check that result.data is truly an array before setting
          setStudents(Array.isArray(result.data) ? result.data : []);
        } else if (result && result.error) {
          console.error("API error:", result.error);
          setStudents([]);
          toast.error(result.error);
        } else {
          console.error("Invalid data structure from API:", result);
          setStudents([]);
          toast.error("Received invalid data from server");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Request failed:", errorData);
        setStudents([]);
        toast.error(errorData.error || "Failed to load students");
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setStudents([]);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  function exportAsCSV() {
    if (safeStudents.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content with header and student data
    const headers = [
      "S/N",
      "school_session",
      "progID",
      "Reg. No",
      "ACCESSCODE",
      "Surename",
      "Other Name(s)",
      "First Name",
      "Gender",
      "ARBY1",
      "ARBY2",
      "ARBY3",
      "BUSY1",
      "BUSY2",
      "BUSY3",
      "CCAY1",
      "CCAY2",
      "CCAY3",
      "ENGY1",
      "ENGY2",
      "ENGY3",
      "FREY1",
      "FREY2",
      "FREY3",
      "HSTY1",
      "HSTY2",
      "HSTY3",
      "LLGY1",
      "LLGY2",
      "LLGY3",
      "MTHY1",
      "MTHY2",
      "MTHY3",
      "NVSY1",
      "NVSY2",
      "NVSY3",
      "PVSY1",
      "PVSY2",
      "PVSY3",
      "RGSY1",
      "RGSY2",
      "RGSY3",
      "TECY1",
      "TECY2",
      "TECY3",
      "rgsType",
      "schType",
      "schcode",
      "lgacode",
      "DATE OF BIRTH"
    ];
    const csvRows = [headers.join(",")];

    safeStudents.forEach((student, index) => {
      // Map religious type to numeric values (1 = Christian, 2 = Islam)
      const religiousTypeCode = student.religiousType?.toLowerCase() === "christian" ? "1" 
        : student.religiousType?.toLowerCase() === "islam" ? "2" 
        : "";
      
      // Map school type to numeric values (0 = Public, 1 = Private)
      const schoolTypeCode = student.schoolType?.toLowerCase() === "private" ? "1" : "0";
      
      const row = [
        index + 1, // S/N
        student.year || "", // school_session
        student.prcd || "", // progID
        student.studentNumber, // Reg. No
        student.accCode, // ACCESSCODE
        student.lastname, // Surename
        student.othername || "", // Other Name(s)
        student.firstname, // First Name
        student.gender, // Gender
        "", // ARBY1
        "", // ARBY2
        "", // ARBY3
        "", // BUSY1
        "", // BUSY2
        "", // BUSY3
        "", // CCAY1
        "", // CCAY2
        "", // CCAY3
        student.englishTerm1 || "", // ENGY1
        student.englishTerm2 || "", // ENGY2
        student.englishTerm3 || "", // ENGY3
        "", // FREY1
        "", // FREY2
        "", // FREY3
        "", // HSTY1
        "", // HSTY2
        "", // HSTY3
        "", // LLGY1
        "", // LLGY2
        "", // LLGY3
        student.arithmeticTerm1 || "", // MTHY1
        student.arithmeticTerm2 || "", // MTHY2
        student.arithmeticTerm3 || "", // MTHY3
        "", // NVSY1
        "", // NVSY2
        "", // NVSY3
        student.generalTerm1 || "", // PVSY1
        student.generalTerm2 || "", // PVSY2
        student.generalTerm3 || "", // PVSY3
        student.religiousTerm1 || "", // RGSY1
        student.religiousTerm2 || "", // RGSY2
        student.religiousTerm3 || "", // RGSY3
        "", // TECY1
        "", // TECY2
        "", // TECY3
        religiousTypeCode, // rgsType
        schoolTypeCode, // schType (0 = Public, 1 = Private)
        student.schoolCode || "", // schcode
        student.lCode || "", // lgacode
        "" // DATE OF BIRTH (empty like sample)
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `students_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${safeStudents.length} students to CSV successfully`);
  }

  async function downloadAllImages() {
    // Filter students who have passport images
    if (safeStudents.length === 0) {
      toast.error("No student data available");
      return;
    }
    const studentsWithImages = safeStudents.filter(student => student.passport && student.passport.trim() !== "");
    
    if (studentsWithImages.length === 0) {
      toast.error("No student images found to download");
      return;
    }

    toast.info(`Preparing to download ${studentsWithImages.length} images...`);
    
    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;

    // Fetch and add each image to the zip
    for (const student of studentsWithImages) {
      try {
        const response = await fetch(student.passport!);
        if (!response.ok) throw new Error("Failed to fetch image");
        
        const blob = await response.blob();
        
        // Get file extension from the URL or default to jpg
        let extension = "jpg";
        const urlParts = student.passport!.split(".");
        if (urlParts.length > 1) {
          const ext = urlParts[urlParts.length - 1].split("?")[0].toLowerCase();
          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
            extension = ext;
          }
        }
        
        // Use student examination number as filename
        const filename = `${student.studentNumber}.${extension}`;
        zip.file(filename, blob);
        successCount++;
      } catch (error) {
        console.error(`Failed to download image for ${student.studentNumber}:`, error);
        errorCount++;
      }
    }

    if (successCount === 0) {
      toast.error("Failed to download any images");
      return;
    }

    // Generate and download the zip file
    try {
      toast.info("Creating zip file...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `student_images_${new Date().toISOString().split("T")[0]}.zip`);
      
      if (errorCount > 0) {
        toast.success(`Downloaded ${successCount} images successfully. ${errorCount} failed.`);
      } else {
        toast.success(`Successfully downloaded all ${successCount} images`);
      }
    } catch (error) {
      console.error("Failed to create zip file:", error);
      toast.error("Failed to create zip file");
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Students Management</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View, search, and manage all registered students
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Search & Filter</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs sm:text-sm"
            >
              <Filter className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or exam number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 text-sm sm:text-base"
              />
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 border-t">
              <Select value={selectedLGA} onValueChange={setSelectedLGA}>
                <SelectTrigger className="w-full sm:w-[200px] text-sm sm:text-base">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {allLGAs.map(lga => (
                    <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-[200px]">
                <Input
                  placeholder="Enter school code..."
                  value={schoolCodeInput}
                  onChange={(e) => setSchoolCodeInput(e.target.value)}
                  className="text-sm sm:text-base"
                />
              </div>

              <Select value={registrationType} onValueChange={setRegistrationType}>
                <SelectTrigger className="w-full sm:w-[200px] text-sm sm:text-base">
                  <SelectValue placeholder="Registration Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedLGA("all");
                  setSchoolCodeInput("");
                  setRegistrationType("all");
                }}
                className="text-xs sm:text-sm"
              >
                Clear Filters
              </Button>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs sm:text-sm"
              onClick={exportAsCSV}
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Export Data
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs sm:text-sm"
              onClick={downloadAllImages}
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Download Images
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Registered Students ({safeStudents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {safeStudents.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No students found</p>
          ) : (
            <div className="overflow-x-auto w-full" style={{ maxWidth: '100%' }}>
              <div className="inline-block min-w-full align-middle">
                <Table className="w-full table-fixed text-xs sm:text-sm" style={{ minWidth: '1800px' }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] border-r">Year</TableHead>
                      <TableHead className="w-[60px] border-r-2">PRCD</TableHead>
                      <TableHead className="w-[80px] sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Photo</TableHead>
                      <TableHead className="w-[150px] sticky left-[80px] bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student Number</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[150px]">Access Code</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Other Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>School Type</TableHead>
                      <TableHead colSpan={3} className="text-center border-l-2">English</TableHead>
                      <TableHead colSpan={3} className="text-center border-l-2">Arithmetic</TableHead>
                      <TableHead colSpan={3} className="text-center border-l-2">General Paper</TableHead>
                      <TableHead colSpan={4} className="text-center border-l-2">Religious Studies</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="border-r"></TableHead>
                      <TableHead className="border-r-2"></TableHead>
                      <TableHead className="sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></TableHead>
                      <TableHead className="sticky left-[80px] bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead className="text-center text-xs border-l-2">Term 1</TableHead>
                      <TableHead className="text-center text-xs">Term 2</TableHead>
                      <TableHead className="text-center text-xs">Term 3</TableHead>
                      <TableHead className="text-center text-xs border-l-2">Term 1</TableHead>
                      <TableHead className="text-center text-xs">Term 2</TableHead>
                      <TableHead className="text-center text-xs">Term 3</TableHead>
                      <TableHead className="text-center text-xs border-l-2">Term 1</TableHead>
                      <TableHead className="text-center text-xs">Term 2</TableHead>
                      <TableHead className="text-center text-xs">Term 3</TableHead>
                      <TableHead className="text-center text-xs border-l-2">Type</TableHead>
                      <TableHead className="text-center text-xs">Term 1</TableHead>
                      <TableHead className="text-center text-xs">Term 2</TableHead>
                      <TableHead className="text-center text-xs">Term 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeStudents.map((student) => {
                      const initials = `${student.lastname[0]}${student.firstname[0]}`
                        .toUpperCase();
                      
                      return (
                        <TableRow key={student.id} className="group hover:bg-muted/50">
                          <TableCell className="border-r">{student.year || "2025/2026"}</TableCell>
                          <TableCell className="border-r-2">{student.prcd || 1}</TableCell>
                          <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={student.passport || ""} 
                                alt={`${student.lastname} ${student.firstname}`}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {initials || <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium sticky left-[80px] bg-background group-hover:bg-muted/50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{student.studentNumber}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              student.registrationType === 'post' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                                : student.registrationType === 'late'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              {student.registrationType === 'post' ? 'Post' : student.registrationType === 'late' ? 'Late' : 'Regular'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{student.accCode}</TableCell>
                          <TableCell>{student.firstname}</TableCell>
                          <TableCell>{student.othername || "-"}</TableCell>
                          <TableCell>{student.lastname}</TableCell>
                          <TableCell>{student.gender}</TableCell>
                          <TableCell>{student.schoolType}</TableCell>
                          
                          {/* English scores */}
                          <TableCell className="text-center border-l-2">{student.englishTerm1 || "-"}</TableCell>
                          <TableCell className="text-center">{student.englishTerm2 || "-"}</TableCell>
                          <TableCell className="text-center">{student.englishTerm3 || "-"}</TableCell>
                          
                          {/* Arithmetic scores */}
                          <TableCell className="text-center border-l-2">{student.arithmeticTerm1 || "-"}</TableCell>
                          <TableCell className="text-center">{student.arithmeticTerm2 || "-"}</TableCell>
                          <TableCell className="text-center">{student.arithmeticTerm3 || "-"}</TableCell>
                          
                          {/* General Paper scores */}
                          <TableCell className="text-center border-l-2">{student.generalTerm1 || "-"}</TableCell>
                          <TableCell className="text-center">{student.generalTerm2 || "-"}</TableCell>
                          <TableCell className="text-center">{student.generalTerm3 || "-"}</TableCell>
                          
                          {/* Religious Studies */}
                          <TableCell className="text-center border-l-2 text-xs">{student.religiousType || "-"}</TableCell>
                          <TableCell className="text-center">{student.religiousTerm1 || "-"}</TableCell>
                          <TableCell className="text-center">{student.religiousTerm2 || "-"}</TableCell>
                          <TableCell className="text-center">{student.religiousTerm3 || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
