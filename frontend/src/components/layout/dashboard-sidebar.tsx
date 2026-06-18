"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BadgeCheck,
  ChevronsUpDown,
  Code2,
  CreditCard,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
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
import { cn } from "@/lib/utils";

export type SidebarVariant = "app" | "admin";

export type SidebarUser = {
  name: string;
  email: string;
  role: string;
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV: Record<SidebarVariant, NavSection[]> = {
  app: [
    {
      label: "Workspace",
      items: [
        {
          href: "/app",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/app/projects",
          label: "Projects",
          icon: FolderKanban,
        },
        {
          href: "/app/studio/demo",
          label: "Studio",
          icon: Code2,
          badge: "Build",
        },
        {
          href: "/app/templates",
          label: "Templates",
          icon: Shapes,
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          href: "/app/billing",
          label: "Billing",
          icon: CreditCard,
        },
        {
          href: "/app/settings",
          label: "Settings",
          icon: Settings,
        },
      ],
    },
  ],

  admin: [
    {
      label: "Operations",
      items: [
        {
          href: "/admin",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          href: "/admin/users",
          label: "Users",
          icon: Users,
        },
        {
          href: "/admin/projects",
          label: "Projects",
          icon: FolderKanban,
        },
        {
          href: "/admin/generations",
          label: "Generations",
          icon: Timer,
          badge: "Live",
        },
        {
          href: "/app/studio/demo",
          label: "Studio",
          icon: Code2,
          badge: "Build",
        },
      ],
    },
    {
      label: "Catalog & Revenue",
      items: [
        {
          href: "/admin/templates",
          label: "Templates",
          icon: Shapes,
        },
        {
          href: "/admin/themes",
          label: "Themes",
          icon: Palette,
        },
        {
          href: "/admin/analytics",
          label: "Analytics",
          icon: BarChart3,
        },
        {
          href: "/admin/billing",
          label: "Billing",
          icon: CreditCard,
        },
      ],
    },
  ],
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function isNavActive(pathname: string, href: string) {
  if (href === "/app" || href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSettingsHref(variant: SidebarVariant) {
  return variant === "admin" ? "/admin/settings" : "/app/settings";
}

function getBillingHref(variant: SidebarVariant) {
  return variant === "admin" ? "/admin/billing" : "/app/billing";
}

export function DashboardSidebar({
  variant,
  user,
  menuThemeClass = "",
}: {
  variant: SidebarVariant;
  user: SidebarUser;
  /** Class carrying the active palette tokens (e.g. "admin-interface dark") so
   *  portaled menus rendered to <body> match the section theme. */
  menuThemeClass?: string;
}) {
  const pathname = usePathname();
  const sections = NAV[variant];

  const homeHref = variant === "admin" ? "/admin" : "/app";
  const settingsHref = getSettingsHref(variant);
  const billingHref = getBillingHref(variant);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-sidebar-border/70",
        "bg-sidebar",
        "[&_[data-sidebar=sidebar]]:bg-sidebar",
      )}
    >
      <SidebarHeader className="border-b border-sidebar-border/70 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-foreground text-sidebar shadow-sm">
              <span className="text-base font-bold tracking-normal">D</span>
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">DashboardCraft</span>
              <span className="block truncate text-[10px] font-medium uppercase tracking-[0.22em] text-sidebar-foreground/55">
                Interface OS
              </span>
            </span>
          </Link>

          <Badge
            variant="secondary"
              className="h-6 rounded-full border border-sidebar-border/70 bg-sidebar-foreground/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden"
          >
            {variant}
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <div
          className={cn(
            "mb-3 rounded-xl border border-sidebar-border/70 bg-sidebar-foreground/[0.06] p-3 shadow-sm",
            "group-data-[collapsible=icon]:hidden",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground">
              <Gauge className="size-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                Production Console
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                Governance workspace
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-foreground/[0.06] px-2.5 py-2 text-xs">
            <span className="text-sidebar-foreground/55">Status</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
        </div>

        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-0">
            <SidebarGroupLabel
              className={cn(
                "h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.16em]",
                "text-sidebar-foreground/45",
                "group-data-[collapsible=icon]:sr-only",
              )}
            >
              {section.label}
            </SidebarGroupLabel>

            <SidebarMenu className="gap-1">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={active}
                      className={cn(
                        "group/menu relative h-10 rounded-xl px-3 text-sidebar-foreground/75",
                        "transition-all duration-200 ease-out",
                        "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                        "data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-primary-foreground",
                        "data-[active=true]:shadow-sm",
                        "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:px-0",
                      )}
                    >
                      <Link href={item.href}>
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground",
                            active && "block",
                          )}
                        />

                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active
                              ? "text-primary-foreground"
                              : "text-sidebar-foreground/55 group-hover/menu:text-sidebar-foreground",
                          )}
                        />

                        <span className="truncate">{item.label}</span>

                        {item.badge ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "ml-auto h-5 rounded-md border border-sidebar-border/60 bg-background/70 px-1.5 text-[10px] font-semibold",
                              "group-data-[collapsible=icon]:hidden",
                            )}
                          >
                            {item.badge}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help Center"
              className={cn(
                "mb-2 h-10 rounded-xl px-3 text-sidebar-foreground/70",
                "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:px-0",
              )}
            >
              <Link href="/support">
                <LifeBuoy className="size-4" />
                <span>Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    "h-12 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 px-2.5",
                    "transition-all duration-200",
                    "hover:bg-sidebar-accent/70",
                    "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                    "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0",
                  )}
                >
                  <Avatar className="size-8 rounded-lg ring-1 ring-sidebar-border">
                    <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/55">
                      {user.email}
                    </span>
                  </div>

                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/45" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={10}
                className={cn("w-64 rounded-xl bg-popover text-popover-foreground", menuThemeClass)}
              >
                <DropdownMenuLabel className="p-3 font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2">
                    <BadgeCheck className="size-4 text-primary" />
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {user.role} workspace
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <User className="size-4" />
                    Account
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={billingHref}>
                    <CreditCard className="size-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  asChild
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
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
