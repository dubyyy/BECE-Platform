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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Download, Trash2, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

interface AccessPin {
  id: string;
  pin: string;
  isActive: boolean;
  usageCount: number;
  ownerLgaCode: string | null;
  ownerSchoolCode: string | null;
  ownerSchoolName: string | null;
  claimedAt: string | null;
  createdAt: string;
}

export default function AccessPinsPage() {
  const [pins, setPins] = useState<AccessPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [filter, setFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');

  useEffect(() => {
    fetchPins();
  }, []);

  async function fetchPins() {
    try {
      const response = await fetch("/api/admin/access-pins");
      if (response.ok) {
        const data = await response.json();
        setPins(data);
      }
    } catch (error) {
      console.error("Failed to fetch PINs:", error);
      toast.error("Failed to load access PINs");
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePins = async () => {
    if (generateCount < 1 || generateCount > 1000) {
      toast.error("Please enter a count between 1 and 1000");
      return;
    }

    try {
      const response = await fetch("/api/admin/access-pins/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: generateCount }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchPins();
        setIsGenerateDialogOpen(false);
        toast.success(data.message);
      } else {
        toast.error("Failed to generate PINs");
      }
    } catch (error) {
      console.error("Failed to generate PINs:", error);
      toast.error("Failed to generate PINs");
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success("PIN copied to clipboard");
  };

  const handleCopyAllPins = () => {
    const activePins = pins.filter(p => p.isActive).map(p => p.pin).join("\n");
    navigator.clipboard.writeText(activePins);
    toast.success(`${pins.filter(p => p.isActive).length} PINs copied to clipboard`);
  };

  const handleDownloadPins = () => {
    const activePins = pins.filter(p => p.isActive).map(p => p.pin).join("\n");
    const blob = new Blob([activePins], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-pins-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PINs downloaded");
  };

  const handleDeactivatePin = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/access-pins?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPins();
        toast.success("PIN deactivated");
      } else {
        toast.error("Failed to deactivate PIN");
      }
    } catch (error) {
      console.error("Failed to deactivate PIN:", error);
      toast.error("Failed to deactivate PIN");
    }
  };

  const handleReactivatePin = async (id: string) => {
    try {
      const response = await fetch("/api/admin/access-pins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchPins();
        toast.success("PIN reactivated");
      } else {
        toast.error("Failed to reactivate PIN");
      }
    } catch (error) {
      console.error("Failed to reactivate PIN:", error);
      toast.error("Failed to reactivate PIN");
    }
  };

  const activePins = pins.filter(p => p.isActive);
  const claimedPins = pins.filter(p => p.ownerSchoolCode);
  const unclaimedPins = pins.filter(p => !p.ownerSchoolCode && p.isActive);

  // Apply filter to displayed pins
  const filteredPins = pins.filter(pin => {
    if (filter === 'claimed') return pin.ownerSchoolCode;
    if (filter === 'unclaimed') return !pin.ownerSchoolCode && pin.isActive;
    return true; // 'all'
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading access PINs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-start">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Access PIN Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Generate and manage access PINs for school portal access
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyAllPins} disabled={activePins.length === 0}>
            <Copy className="mr-2 h-4 w-4" />
            Copy All
          </Button>
          <Button variant="outline" onClick={handleDownloadPins} disabled={activePins.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate PINs
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Access PINs</DialogTitle>
                <DialogDescription>
                  Generate multiple access PINs that can be distributed to schools
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="count">Number of PINs (1-1000)</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="1000"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGeneratePins}>Generate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unclaimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unclaimedPins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{claimedPins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pins.reduce((sum, p) => sum + p.usageCount, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* PINs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base sm:text-lg">Access PINs ({filteredPins.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({pins.length})
              </Button>
              <Button
                variant={filter === 'claimed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('claimed')}
              >
                Claimed ({claimedPins.length})
              </Button>
              <Button
                variant={filter === 'unclaimed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unclaimed')}
              >
                Unclaimed ({unclaimedPins.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">PIN</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Owner School</TableHead>
                  <TableHead className="text-xs sm:text-sm">Usage</TableHead>
                  <TableHead className="text-xs sm:text-sm">Claimed</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No pins found for the selected filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPins.map((pin) => (
                  <TableRow key={pin.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs sm:text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded">{pin.pin}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyPin(pin.pin)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pin.isActive ? "default" : "secondary"}>
                        {pin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {pin.ownerSchoolName ? (
                        <div>
                          <div className="font-medium">{pin.ownerSchoolName}</div>
                          <div className="text-xs text-muted-foreground">
                            {pin.ownerLgaCode} - {pin.ownerSchoolCode}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">Unclaimed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{pin.usageCount}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {pin.claimedAt ? new Date(pin.claimedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        {pin.isActive ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate PIN</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate this PIN? It will no longer grant access to the portal.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeactivatePin(pin.id)}>
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 sm:h-9"
                            onClick={() => handleReactivatePin(pin.id)}
                          >
                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
