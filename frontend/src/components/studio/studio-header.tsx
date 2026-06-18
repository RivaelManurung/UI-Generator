"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard, CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StudioHeaderProps {
  projectName: string;
  credits: number;
  onTopUp: () => void;
}

export function StudioHeader({ projectName, credits, onTopUp }: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-3 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors gap-2 shrink-0"
          href="/app/projects"
        >
          <ArrowLeft className="h-4 w-4" />
          My Projects
        </Link>

        <div className="hidden h-6 w-px bg-border md:block shrink-0" />

        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">
              Dashboard Studio
              <span className="mx-1.5 text-muted-foreground">|</span>
              <span className="font-semibold text-muted-foreground">{projectName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge className="gap-1.5 rounded-lg border-border bg-card px-3 py-1.5 text-card-foreground shadow-sm text-xs font-bold" variant="outline">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          {credits} Credits
        </Badge>

        <Button onClick={onTopUp} size="sm" className="hidden md:inline-flex text-xs font-bold" aria-label="Top up credit balance">
          <Plus className="h-4 w-4" />
          Top Up
        </Button>
      </div>
    </header>
  );
}
