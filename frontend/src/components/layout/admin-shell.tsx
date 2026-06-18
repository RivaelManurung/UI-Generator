"use client";

import { type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { InterfaceTokenSync } from "@/components/app/interface-token-sync";
import { useAdminTheme } from "@/components/admin/admin-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { getCurrentUser } from "@/lib/api/auth";

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { dark, toggle: toggleTheme } = useAdminTheme();

  const currentUser = getCurrentUser();
  const user = currentUser
    ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
    : { name: "Admin", email: "admin@example.com", role: "admin" };

  return (
    <SidebarProvider className={cn("admin-interface", dark && "dark")}>
      <InterfaceTokenSync key={dark ? "dark" : "light"} selector=".admin-interface" />
      <DashboardSidebar variant="admin" user={user} menuThemeClass={cn("admin-interface", dark && "dark")} />
      <SidebarInset className="bg-background text-foreground">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-bold tracking-normal">{title}</h1>
              <Badge className="rounded-full bg-primary text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
                Admin
              </Badge>
            </div>
            {subtitle ? (
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
