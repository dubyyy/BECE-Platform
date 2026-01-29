"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  School, 
  Settings, 
  LogOut,
  KeyRound,
  FileJson,
  Key,
  ClipboardList,
  Wrench
} from "lucide-react";
import { Button } from "./ui/button";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Students",
    href: "/admin/students",
    icon: Users,
  },
  {
    title: "Schools",
    href: "/admin/schools",
    icon: School,
  },
  {
    title: "Management Console",
    href: "/admin/manage",
    icon: Wrench,
  },
  {
    title: "Access PINs",
    href: "/admin/access-pins",
    icon: Key,
  },
  {
    title: "Add Result",
    href: "/admin/add-result",
    icon: ClipboardList,
  },
  {
    title: "Data.json Manager",
    href: "/admin/data-json",
    icon: FileJson,
  },
  {
    title: "Reset Password",
    href: "/admin/reset-password",
    icon: KeyRound,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  if (!open) return null;

  return (
    <aside className="w-64 border-r border-border bg-card">
      <div className="flex flex-col h-full">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => {
              fetch("/api/admin/logout", { method: "POST" })
                .catch(() => {})
                .finally(() => {
                  window.location.href = "/admin";
                });
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
