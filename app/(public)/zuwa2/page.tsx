"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Users, School, FileCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Stats {
  totalStudents: number;
  totalSchools: number;
  registrationsToday: number;
  studentTrend: number;
  todayTrend: number;
  registrationStatus: string;
}

interface LGAData {
  lga: string;
  students: number;
  schools: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lgaData, setLgaData] = useState<LGAData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, lgaRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/lga-stats"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (lgaRes.ok) {
          const lgaDataRes = await lgaRes.json();
          setLgaData(lgaDataRes);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      trend: {
        value: `${stats.studentTrend > 0 ? "+" : ""}${stats.studentTrend}% from last month`,
        isPositive: stats.studentTrend > 0,
      },
    },
    {
      title: "Total Schools",
      value: stats.totalSchools.toString(),
      icon: School,
      trend: { value: "Active in system", isPositive: true },
    },
    {
      title: "Registrations Today",
      value: stats.registrationsToday.toString(),
      icon: FileCheck,
      trend: {
        value: `${stats.todayTrend > 0 ? "+" : ""}${stats.todayTrend}% from yesterday`,
        isPositive: stats.todayTrend >= 0,
      },
    },
    {
      title: "Registration Status",
      value: stats.registrationStatus,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Quick overview of student registrations and school statistics
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 md:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Students by Local Government</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {lgaData.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Local Government</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Students</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Schools</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lgaData.map((row) => (
                    <TableRow key={row.lga} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs sm:text-sm">{row.lga}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{row.students}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{row.schools}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
