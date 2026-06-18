"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CreditCard, Plus, Search, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCreditBalance } from "@/hooks/use-credit-balance";

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  const { balance } = useCreditBalance();

  return (
    <header className="sticky top-0 z-20 border-b border-border/90 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/84">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="hidden data-[orientation=vertical]:h-5 sm:block" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-normal text-foreground">{title}</h1>
          <p className="hidden truncate text-sm font-medium text-muted-foreground sm:block">{subtitle}</p>
        </div>

        <div className="hidden min-w-56 max-w-72 flex-1 items-center gap-2 rounded-xl border border-border/90 bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm lg:flex">
          <Search className="size-4 shrink-0" />
          <span className="truncate">Search projects, templates, generations</span>
          <Badge variant="outline" className="ml-auto rounded-md bg-background px-1.5">
            /
          </Badge>
        </div>

        <Link
          href="/app/billing"
          className="hidden items-center gap-2 rounded-xl border border-border/90 bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted/40 md:flex"
        >
          <CreditCard className="size-4 text-muted-foreground" />
          <span className="font-bold tabular-nums text-foreground">
            {balance ? balance.available.toLocaleString() : "—"}
          </span>
          <span className="text-muted-foreground">credits</span>
        </Link>

        {actions ?? (
          <Button size="sm" asChild>
            <Link href="/app/studio/demo">
              <Plus className="size-4" />
              New generation
            </Link>
          </Button>
        )}

        <Button aria-label="Notifications" className="hidden sm:inline-flex" size="icon-sm" variant="outline">
          <Bell className="size-4" />
        </Button>
        <Button aria-label="Account menu" className="hidden sm:inline-flex" size="icon-sm" variant="outline">
          <Avatar className="size-5">
            <AvatarFallback className="bg-transparent">
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  );
}
