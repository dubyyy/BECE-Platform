"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
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

interface SchoolData {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

export default function DataJsonManager() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [newSchool, setNewSchool] = useState({
    lgaCode: "",
    lCode: "",
    schCode: "",
    progID: "",
    schName: "",
  });
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvData, setParsedCsvData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      
      const response = await fetch(`/api/admin/data-json?${params}`);
      if (response.ok) {
        const result = await response.json();
        setSchools(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } else {
        toast.error("Failed to load data.json");
      }
    } catch (error) {
      console.error("Failed to fetch data.json:", error);
      toast.error("Failed to load data.json");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  // Fetch schools when page or search changes
  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setCsvFile(file);
    const text = await file.text();
    const parsed = parseCSV(text);
    setParsedCsvData(parsed);
    
    if (parsed.length > 0) {
      toast.success(`Parsed ${parsed.length} rows from CSV`);
    } else {
      toast.error("No valid data found in CSV");
    }
  };

  const handleUploadCsv = async () => {
    if (parsedCsvData.length === 0) {
      toast.error("No data to upload");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/data-json/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schools: parsedCsvData }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully added ${result.count} schools to data.json`);
        setCsvFile(null);
        setParsedCsvData([]);
        setIsAddDialogOpen(false);
        fetchSchools();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload CSV");
      }
    } catch (error) {
      console.error("Failed to upload CSV:", error);
      toast.error("Failed to upload CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSchool = async () => {
    if (
      !newSchool.lgaCode ||
      !newSchool.schCode ||
      !newSchool.progID ||
      !newSchool.schName
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/data-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchool),
      });

      if (response.ok) {
        setNewSchool({
          lgaCode: "",
          lCode: "",
          schCode: "",
          progID: "",
          schName: "",
        });
        setIsAddDialogOpen(false);
        toast.success("School added to data.json successfully");
        // Refresh the current page
        fetchSchools();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add school");
      }
    } catch (error) {
      console.error("Failed to add school:", error);
      toast.error("Failed to add school");
    }
  };

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    try {
      const response = await fetch("/api/admin/data-json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSchool),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
        setEditingSchool(null);
        toast.success("School updated successfully");
        // Refresh current page
        fetchSchools();
      } else {
        toast.error("Failed to update school");
      }
    } catch (error) {
      console.error("Failed to update school:", error);
      toast.error("Failed to update school");
    }
  };

  const handleDeleteSchool = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/data-json?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("School deleted from data.json successfully");
        // Refresh current page
        fetchSchools();
      } else {
        toast.error("Failed to delete school");
      }
    } catch (error) {
      console.error("Failed to delete school:", error);
      toast.error("Failed to delete school");
    }
  };

  const openEditDialog = (school: SchoolData) => {
    setEditingSchool({ ...school });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading data.json...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Data.json Manager
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage schools directly in data.json file ({total} total entries)
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add to data.json
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add to data.json</DialogTitle>
                <DialogDescription>
                  Add schools manually or upload a CSV file
                </DialogDescription>
              </DialogHeader>

              {/* Mode Toggle */}
              <div className="flex gap-2 border-b pb-4">
                <Button
                  type="button"
                  variant={addMode === "manual" ? "default" : "outline"}
                  onClick={() => setAddMode("manual")}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Manual Entry
                </Button>
                <Button
                  type="button"
                  variant={addMode === "csv" ? "default" : "outline"}
                  onClick={() => setAddMode("csv")}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </div>

              {addMode === "manual" ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schName">School Name *</Label>
                  <Input
                    id="schName"
                    placeholder="e.g., GOVERNMENT SECONDARY SCHOOL, ASABA"
                    value={newSchool.schName}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, schName: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lgaCode">LGA Code *</Label>
                    <Input
                      id="lgaCode"
                      placeholder="e.g., 8"
                      value={newSchool.lgaCode}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, lgaCode: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schCode">School Code *</Label>
                    <Input
                      id="schCode"
                      placeholder="e.g., 1"
                      value={newSchool.schCode}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, schCode: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="progID">Program ID *</Label>
                    <Input
                      id="progID"
                      placeholder="e.g., 1 or 2"
                      value={newSchool.progID}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, progID: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lCode">L Code</Label>
                    <Input
                      id="lCode"
                      placeholder="Optional (NULL if empty)"
                      value={newSchool.lCode}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, lCode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    CSV should have headers: lgaCode, lCode, schCode, progID, schName
                  </p>
                </div>

                {parsedCsvData.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview ({parsedCsvData.length} rows)</Label>
                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                      <div className="text-xs space-y-1">
                        {parsedCsvData.slice(0, 5).map((row, idx) => (
                          <div key={idx} className="pb-2 border-b last:border-b-0">
                            <div><strong>School:</strong> {row.schName}</div>
                            <div className="text-muted-foreground">
                              LGA: {row.lgaCode}, SchCode: {row.schCode}, ProgID: {row.progID}
                            </div>
                          </div>
                        ))}
                        {parsedCsvData.length > 5 && (
                          <p className="text-muted-foreground pt-2">
                            ...and {parsedCsvData.length - 5} more rows
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setCsvFile(null);
                    setParsedCsvData([]);
                    setAddMode("manual");
                  }}
                >
                  Cancel
                </Button>
                {addMode === "manual" ? (
                  <Button onClick={handleAddSchool}>Add School</Button>
                ) : (
                  <Button 
                    onClick={handleUploadCsv} 
                    disabled={parsedCsvData.length === 0 || isUploading}
                  >
                    {isUploading ? "Uploading..." : `Upload ${parsedCsvData.length} Schools`}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by school name, LGA code, school code, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update school details in data.json
            </DialogDescription>
          </DialogHeader>

          {editingSchool && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-schName">School Name</Label>
                <Input
                  id="edit-schName"
                  value={editingSchool.schName}
                  onChange={(e) =>
                    setEditingSchool({
                      ...editingSchool,
                      schName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-lgaCode">LGA Code</Label>
                  <Input
                    id="edit-lgaCode"
                    value={editingSchool.lgaCode}
                    onChange={(e) =>
                      setEditingSchool({
                        ...editingSchool,
                        lgaCode: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-schCode">School Code</Label>
                  <Input
                    id="edit-schCode"
                    value={editingSchool.schCode}
                    onChange={(e) =>
                      setEditingSchool({
                        ...editingSchool,
                        schCode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-progID">Program ID</Label>
                  <Input
                    id="edit-progID"
                    value={editingSchool.progID}
                    onChange={(e) =>
                      setEditingSchool({
                        ...editingSchool,
                        progID: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-lCode">L Code</Label>
                  <Input
                    id="edit-lCode"
                    value={editingSchool.lCode}
                    onChange={(e) =>
                      setEditingSchool({
                        ...editingSchool,
                        lCode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingSchool(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateSchool}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TABLE SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            All Schools ({total} {debouncedSearch && `matching "${debouncedSearch}"`})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">School Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">LGA Code</TableHead>
                  <TableHead className="text-xs sm:text-sm">School Code</TableHead>
                  <TableHead className="text-xs sm:text-sm">Prog ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">L Code</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {schools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {debouncedSearch
                          ? "No schools found matching your search"
                          : "No schools in data.json"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  schools.map((school: SchoolData) => (
                    <TableRow key={school.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs sm:text-sm font-mono">
                        {school.id}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {school.schName}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {school.lgaCode}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {school.schCode}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {school.progID}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {school.lCode}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            onClick={() => openEditDialog(school)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete School</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {school.schName}?
                                  This will permanently remove it from data.json.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSchool(school.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • Showing {schools.length} of {total} schools
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
