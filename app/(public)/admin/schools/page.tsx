"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Edit, Trash2, LockKeyhole, Key, Copy, Ban, Church } from "lucide-react";
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

import { Badge } from "@/components/ui/badge";

interface School {
  id: string;
  name: string;
  code: string;
  lga: string;
  lgaCode: string;
  studentCount: number;
  status: string;
  accessPin: string | null;
  blocked: boolean;
  religiousClassification: string | null;
  createdAt: string;
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: "", code: "", lga: "" });

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const response = await fetch("/api/admin/schools");
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
      }
    } catch (error) {
      console.error("Failed to fetch schools:", error);
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  }

  const handleAddSchool = async () => {
    if (!newSchool.name || !newSchool.code || !newSchool.lga) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchool),
      });

      if (response.ok) {
        const createdSchool = await response.json();
        setSchools([createdSchool, ...schools]);
        setNewSchool({ name: "", code: "", lga: "" });
        setIsAddDialogOpen(false);
        toast.success("School added successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add school");
      }
    } catch (error) {
      console.error("Failed to add school:", error);
      toast.error("Failed to add school");
    }
  };

  const handleDeleteSchool = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/schools?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSchools(schools.filter((school) => school.id !== id));
        toast.success("School deleted successfully");
      } else {
        toast.error("Failed to delete school");
      }
    } catch (error) {
      console.error("Failed to delete school:", error);
      toast.error("Failed to delete school");
    }
  };

  const handleToggleRegistration = (id: string) => {
    setSchools(
      schools.map((school) =>
        school.id === id
          ? { ...school, status: school.status === "Open" ? "Closed" : "Open" }
          : school
      )
    );

    toast.success("Registration status updated");
  };

  const handleGeneratePin = async (schoolId: string) => {
    try {
      const response = await fetch("/api/admin/schools/generate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(
          schools.map((school) =>
            school.id === schoolId
              ? { ...school, accessPin: data.accessPin }
              : school
          )
        );
        toast.success(`Access PIN generated: ${data.accessPin}`);
      } else {
        toast.error("Failed to generate PIN");
      }
    } catch (error) {
      console.error("Failed to generate PIN:", error);
      toast.error("Failed to generate PIN");
    }
  };

  const handleCopyPin = (pin: string, schoolName: string) => {
    navigator.clipboard.writeText(pin);
    toast.success(`PIN copied for ${schoolName}`);
  };

  const handleBulkGeneratePins = async () => {
    try {
      const response = await fetch("/api/admin/schools/bulk-generate-pins", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          // Refresh schools to show new PINs
          await fetchSchools();
          toast.success(data.message);
        } else {
          toast.info(data.message);
        }
      } else {
        toast.error("Failed to generate PINs");
      }
    } catch (error) {
      console.error("Failed to bulk generate PINs:", error);
      toast.error("Failed to generate PINs");
    }
  };

  const handleBlockSchool = async (schoolId: string, blocked: boolean) => {
    try {
      const response = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "school", id: schoolId, blocked }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchSchools();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update block status");
      }
    } catch (error) {
      console.error("Failed to update block status:", error);
      toast.error("Failed to update block status");
    }
  };

  const handleUpdateClassification = async (schoolId: string, classification: string | null) => {
    try {
      const response = await fetch("/api/admin/school-classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, classification }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchSchools();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update classification");
      }
    } catch (error) {
      console.error("Failed to update classification:", error);
      toast.error("Failed to update classification");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading schools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Schools Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Add, edit, and manage schools in the system
          </p>
        </div>

        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Key className="mr-2 h-4 w-4" />
                <span className="sm:inline">Generate All PINs</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Generate PINs for All Schools</AlertDialogTitle>
                <AlertDialogDescription>
                  This will generate access PINs for all schools that don't have one yet. 
                  Schools that already have PINs will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkGeneratePins}>
                  Generate PINs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="sm:inline">Add New School</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Enter the details of the new school
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Government Secondary School"
                  value={newSchool.name}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">School Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., AN001"
                  value={newSchool.code}
                  onChange={(e) =>
                    setNewSchool({ ...newSchool, code: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lga">Local Government</Label>
                <Select
                  value={newSchool.lga}
                  onValueChange={(value) =>
                    setNewSchool({ ...newSchool, lga: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LGA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aba North">Aba North</SelectItem>
                    <SelectItem value="Aba South">Aba South</SelectItem>
                    <SelectItem value="Umuahia North">Umuahia North</SelectItem>
                    <SelectItem value="Bende">Bende</SelectItem>
                    <SelectItem value="Isiala Ngwa North">
                      Isiala Ngwa North
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSchool}>Add School</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">All Schools ({schools.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {/* FIXED TABLE OVERFLOW */}
          <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">School Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">School Code</TableHead>
                  <TableHead className="text-xs sm:text-sm">LGA</TableHead>
                  <TableHead className="text-xs sm:text-sm">Access PIN</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Blocked</TableHead>
                  <TableHead className="text-xs sm:text-sm">Religion</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {school.name}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{school.code}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{school.lga}</TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      {school.accessPin ? (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {school.accessPin}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyPin(school.accessPin!, school.name)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not set</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          school.status === "Open" ? "default" : "secondary"
                        }
                      >
                        {school.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={school.blocked ? "destructive" : "outline"}>
                        {school.blocked ? "Blocked" : "Active"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      {school.religiousClassification || "-"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                        {/* Generate/Regenerate PIN */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant={school.accessPin ? "outline" : "default"}
                              size="sm"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <Key className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {school.accessPin ? "Regenerate" : "Generate"} Access PIN
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {school.accessPin
                                  ? `Are you sure you want to regenerate the access PIN for ${school.name}? The old PIN will no longer work.`
                                  : `Generate a new access PIN for ${school.name}? This will allow the school to access the portal.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleGeneratePin(school.id)}
                              >
                                {school.accessPin ? "Regenerate" : "Generate"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Toggle Registration */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant={
                                school.status === "Open"
                                  ? "destructive"
                                  : "default"
                              }
                              size="sm"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <LockKeyhole className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {school.status === "Open"
                                  ? "Close"
                                  : "Open"}{" "}
                                Registration
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to{" "}
                                {school.status === "Open"
                                  ? "close"
                                  : "open"}{" "}
                                registration for {school.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleToggleRegistration(school.id)
                                }
                              >
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Block/Unblock */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant={school.blocked ? "default" : "destructive"}
                              size="sm" 
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <Ban className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {school.blocked ? "Unblock" : "Block"} School
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {school.blocked ? "unblock" : "block"} {school.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleBlockSchool(school.id, !school.blocked)}
                              >
                                {school.blocked ? "Unblock" : "Block"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Religious Classification */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                              <Church className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Religious Classification</DialogTitle>
                              <DialogDescription>
                                Set religious classification for {school.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select
                                defaultValue={school.religiousClassification || "None"}
                                onValueChange={(value) => {
                                  const classification = value === "None" ? null : value;
                                  handleUpdateClassification(school.id, classification);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select classification" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Christian">Christian</SelectItem>
                                  <SelectItem value="Muslim">Muslim</SelectItem>
                                  <SelectItem value="None">None</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete School</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {school.name}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteSchool(school.id)
                                }
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
