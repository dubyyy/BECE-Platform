"use client";

import { useState, useEffect } from "react";
import { LGA_MAPPING } from "@/lib/lga-mapping";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  RefreshCw,
  LogOut,
  Users,
  School,
  Calendar,
  ShieldCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface StudentSchool {
  schoolName: string;
  lgaCode?: string;
}

interface Student {
  id: string;
  studentNumber: string;
  firstname: string;
  othername?: string | null;
  lastname: string;
  gender?: string;
  schoolType?: string;
  year?: string;
  status?: string;
  passport?: string | null;
  lateRegistration?: boolean;
  school: StudentSchool;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CIEStudentsPage() {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem("cieAuthToken");
    router.push("/");
  };

  const [authData, setAuthData] = useState<{ lgaCode: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filters
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"number" | "name" | "school">("number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    try {
      const token = localStorage.getItem("cieAuthToken");
      if (!token) return;

      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.lgaCode) {
        setAuthData({ lgaCode: payload.lgaCode });
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [authData]);

  useEffect(() => {
    if (authData) loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, page]);

  const loadStudents = async () => {
    if (!authData) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("cieAuthToken");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const params = new URLSearchParams({
        lgaCode: authData.lgaCode,
        page: page.toString(),
        limit: "50",
      });
      const res = await fetch(`/api/cie/students?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("cieAuthToken");
          router.push("/");
          toast.error("Session expired. Please login again.");
          return;
        }
        throw new Error(await res.text());
      }
      const data = await res.json();
      setStudents(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch (err) {
      console.error(err);
      toast.error("Could not load students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery && yearFilter === "all" && schoolFilter === "all") return true;

    const q = searchQuery.toLowerCase();
    const name = `${s.lastname} ${s.othername || ""} ${s.firstname}`.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      s.studentNumber.toLowerCase().includes(q) ||
      name.includes(q) ||
      s.gender?.toLowerCase().includes(q) ||
      s.schoolType?.toLowerCase().includes(q) ||
      s.school.schoolName.toLowerCase().includes(q);

    const matchesYear = yearFilter === "all" || s.year === yearFilter;
    const matchesSchool = schoolFilter === "all" || s.school.schoolName === schoolFilter;

    return matchesSearch && matchesYear && matchesSchool;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "number") {
      comparison = a.studentNumber.localeCompare(b.studentNumber, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    } else if (sortBy === "name") {
      const nameA = `${a.lastname} ${a.firstname}`.toLowerCase();
      const nameB = `${b.lastname} ${b.firstname}`.toLowerCase();
      comparison = nameA.localeCompare(nameB);
    } else if (sortBy === "school") {
      comparison = a.school.schoolName.localeCompare(b.school.schoolName);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Get unique years and schools for filters
  const uniqueYears = Array.from(new Set(students.map((s) => s.year).filter(Boolean))).sort();
  const uniqueSchools = Array.from(new Set(students.map((s) => s.school.schoolName))).sort();

  // Calculate statistics
  const maleCount = students.filter((s) => s.gender?.toLowerCase() === "male").length;
  const femaleCount = students.filter((s) => s.gender?.toLowerCase() === "female").length;
  const lateRegCount = students.filter((s) => s.lateRegistration).length;

  const handleExportCSV = () => {
    const headers = [
      "Student Number",
      "Surname",
      "First Name",
      "Other Name",
      "Gender",
      "School",
      "Type",
      "Year",
      "Registration",
    ];
    const rows = sortedStudents.map((s) => [
      s.studentNumber,
      s.lastname,
      s.firstname,
      s.othername || "",
      s.gender || "",
      s.school.schoolName,
      s.schoolType || "",
      s.year || "",
      s.lateRegistration ? "Late" : "Regular",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cie_students_${lgaName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export successful!");
  };

  // Derived Stats
  const lgaName = authData ? LGA_MAPPING[authData.lgaCode] || authData.lgaCode : "...";
  const totalCount = meta?.total || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3 xl:px-8 2xl:px-12 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-10 flex-shrink-0">
              <Image
                src="/delta-logo.png"
                alt="Delta State Government Seal"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="border-l border-primary-foreground/30 pl-3">
              <p className="text-xs font-medium tracking-wide uppercase opacity-90">
                Delta State Government
              </p>
              <p className="text-sm font-semibold">CIE Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authData && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-foreground/10 rounded border border-primary-foreground/20">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {lgaName}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs font-medium"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <div className="h-0.5 bg-primary-foreground/20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 xl:px-8 2xl:px-12 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Dashboard Overview
            </h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-lg leading-relaxed">
              Monitoring student registration data for{" "}
              <span className="font-semibold text-foreground">{lgaName}</span> Local Government Area.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-primary hover:underline underline-offset-2"
          >
            ← Return to main portal
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative group overflow-hidden bg-card p-5 rounded-lg border border-border hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Users className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Total Enrolled
              </p>
              <h3 className="text-3xl font-bold text-foreground mt-2 tracking-tight">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  totalCount.toLocaleString()
                )}
              </h3>
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  {lgaName}
                </Badge>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-card p-5 rounded-lg border border-border hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Users className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Gender Distribution
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-primary tracking-tight">
                    {maleCount}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Male</p>
                </div>
                <div className="h-8 w-px bg-border"></div>
                <div>
                  <h3 className="text-2xl font-bold text-pink-600 tracking-tight">
                    {femaleCount}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Female</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-card p-5 rounded-lg border border-border hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Calendar className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Late Registrations
              </p>
              <h3 className="text-3xl font-bold text-foreground mt-2 tracking-tight">
                {lateRegCount}
              </h3>
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  2025/2026
                </Badge>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-card p-5 rounded-lg border border-border hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldCheck className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Portal Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h3 className="text-xl font-bold text-foreground">Active</h3>
              </div>
              <div className="mt-3">
                <Badge
                  variant="secondary"
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  Online
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 md:p-6 border-b border-border space-y-4">
            {/* Search Bar */}
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="Search by name, student number, school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11"
              />
            </div>

            {/* Filters and Actions Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Filter */}
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="h-10 w-[140px]">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year || "unknown"}>
                      {year || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* School Filter */}
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="h-10 w-[180px]">
                  <School className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {uniqueSchools.map((school) => (
                    <SelectItem key={school} value={school}>
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(v: "number" | "name" | "school") => setSortBy(v)}>
                <SelectTrigger className="h-10 w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Student Number</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-10 w-10 p-0"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>

              <div className="flex-1" />

              {/* Clear Filters */}
              {(searchQuery || yearFilter !== "all" || schoolFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setYearFilter("all");
                    setSchoolFilter("all");
                  }}
                  className="h-10 text-muted-foreground"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}

              {/* Export CSV */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={sortedStudents.length === 0}
                className="h-10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadStudents}
                disabled={loading}
                className="h-10"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin", !loading && "mr-2")} />
                {!loading && "Refresh"}
              </Button>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{sortedStudents.length}</span> of{" "}
                <span className="font-semibold text-foreground">{students.length}</span> students
              </p>
            </div>
          </div>

          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] pl-6">Photo</TableHead>
                  <TableHead>Student No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell text-right pr-8">
                    Reg. Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <div className="p-6 bg-muted rounded-full">
                          <Search className="h-10 w-10" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mt-2">
                          No results found
                        </h3>
                        <p className="text-sm max-w-sm mx-auto leading-relaxed">
                          {searchQuery
                            ? `No students matching "${searchQuery}". Try a different search term.`
                            : "No student records available for this LGA at the moment."}
                        </p>
                        {searchQuery && (
                          <Button variant="secondary" onClick={() => setSearchQuery("")} className="mt-4">
                            Clear search filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow key={student.id} className="group hover:bg-accent/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="relative h-11 w-11 rounded-full overflow-hidden bg-muted ring-2 ring-background shadow-sm">
                          {student.passport ? (
                            <img
                              src={student.passport}
                              alt="Passport"
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-muted">
                              <Users className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground tracking-tight">
                        {student.studentNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">
                            {student.lastname}, {student.firstname}
                          </span>
                          {student.othername && (
                            <span className="text-xs text-muted-foreground">{student.othername}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium capitalize">
                          {student.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 max-w-[220px]">
                          <School className="h-3.5 w-3.5 shrink-0" />
                          <span
                            className="truncate font-medium"
                            title={student.school.schoolName}
                          >
                            {student.school.schoolName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">
                          <GraduationCap className="w-3 h-3 mr-1.5" />
                          {student.schoolType || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right pr-8">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            student.lateRegistration
                              ? "bg-amber-50 text-amber-700 border-amber-200/50"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full mr-1.5",
                              student.lateRegistration ? "bg-amber-500" : "bg-emerald-500"
                            )}
                          />
                          {student.lateRegistration ? "Late" : "Regular"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {meta && meta.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {(page - 1) * meta.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-foreground">
                  {Math.min(page * meta.limit, meta.total)}
                </span>{" "}
                of <span className="font-bold text-foreground">{meta.total}</span> entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                    let pNum = i + 1;
                    if (meta.totalPages > 5 && page > 3) {
                      pNum = page - 2 + i;
                    }
                    return (
                      pNum <= meta.totalPages && (
                        <button
                          key={pNum}
                          onClick={() => setPage(pNum)}
                          className={cn(
                            "w-8 h-8 rounded text-xs font-semibold transition-all",
                            page === pNum
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {pNum}
                        </button>
                      )
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 xl:px-8 2xl:px-12 text-center text-xs opacity-80 max-w-7xl">
          &copy; {new Date().getFullYear()} Delta State Government, Ministry of Basic & Secondary
          Education
        </div>
      </footer>
    </div>
  );
}
