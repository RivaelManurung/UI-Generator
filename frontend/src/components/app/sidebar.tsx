"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChevronsUpDown,
  Code2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  Shapes,
  Timer,
  User,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type NavSection = { label: string; items: NavItem[] };

const NAV: Record<"app" | "admin", NavSection[]> = {
  app: [
    {
      label: "Build",
      items: [
        { href: "/app", label: "Overview", icon: LayoutDashboard },
        { href: "/app/projects", label: "Projects", icon: FolderKanban },
        { href: "/app/studio/demo", label: "Studio", icon: Code2 },
        { href: "/app/templates", label: "Templates", icon: Shapes },
      ],
    },
    {
      label: "Manage",
      items: [
        { href: "/app/billing", label: "Credits", icon: CreditCard },
        { href: "/app/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: "Operations",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/projects", label: "Projects", icon: FolderKanban },
        { href: "/admin/generations", label: "Generations", icon: Timer },
      ],
    },
    {
      label: "Catalog",
      items: [
        { href: "/admin/templates", label: "Templates", icon: Shapes },
        { href: "/admin/themes", label: "Themes", icon: Palette },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/billing", label: "Billing", icon: CreditCard },
      ],
    },
  ],
};

export function AppSidebar({
  variant,
  user,
}: {
  variant: "app" | "admin";
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const sections = NAV[variant];
  const { balance, loading } = useCreditBalance();

  const usedPct =
    balance && balance.monthlyLimit > 0
      ? Math.min(100, Math.round((balance.usedThisMonth / balance.monthlyLimit) * 100))
      : 0;

  const isActive = (href: string) =>
    href === "/app" || href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar [--sidebar-width:16.25rem] [&_[data-sidebar=sidebar]]:bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link
          href={variant === "admin" ? "/admin" : "/app"}
          className="flex items-center gap-3 rounded-xl px-1.5 py-1 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <LayoutDashboard className="size-4" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-bold text-sidebar-foreground">DashboardCraft</span>
            <span className="block truncate text-xs font-medium text-sidebar-foreground/62">Schema dashboard studio</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="py-2">
            <SidebarGroupLabel className="px-2 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {section.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className={cn(
                      "h-10 rounded-xl border border-transparent px-3 font-medium text-sidebar-foreground/68 transition-all",
                      "hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      "data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:font-bold data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm",
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                      {item.badge ? (
                        <Badge
                          className="ml-auto h-5 rounded-md bg-secondary px-1.5 text-secondary-foreground group-data-[collapsible=icon]:hidden"
                          variant="secondary"
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="mb-3 rounded-2xl border border-sidebar-border bg-muted/35 p-3 shadow-sm group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Credits</span>
            <span className="text-xs font-bold tabular-nums text-foreground">
              {balance ? `${balance.available.toLocaleString()} credits` : "—"}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            {balance ? (
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${usedPct}%` }}
              />
            ) : (
              <div className={cn("h-full rounded-full bg-muted-foreground/20", loading && "animate-pulse")} />
            )}
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {balance
              ? `${balance.usedThisMonth.toLocaleString()} / ${balance.monthlyLimit.toLocaleString()} used this month`
              : "Loading usage…"}
          </p>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-xl border border-transparent text-sidebar-foreground hover:bg-sidebar-accent data-[state=open]:border-sidebar-border data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email || user.role || "Signed in"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">
                    <User className="size-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogOut className="size-4" />
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
