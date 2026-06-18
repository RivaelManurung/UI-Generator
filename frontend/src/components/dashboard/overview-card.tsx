"use client";

import type { ComponentType } from "react";

import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface OverviewStat {
  label: string;
  value: string;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
}

export function OverviewCards({
  stats,
  loading = false,
}: {
  stats: OverviewStat[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton className="h-28 rounded-2xl" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <SectionCard className="h-full" key={stat.label}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-normal text-foreground">
                  {stat.value}
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                <stat.icon className="size-4" />
              </span>
            </div>
            {stat.detail ? (
              <p className="mt-4 truncate text-xs font-medium text-muted-foreground">{stat.detail}</p>
            ) : null}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
