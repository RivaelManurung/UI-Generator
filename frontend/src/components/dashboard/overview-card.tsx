"use client";

import type { ComponentType } from "react";

import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

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
    <RevealGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.05}>
      {stats.map((stat) => (
        <RevealItem className="h-full" key={stat.label}>
          <SectionCard className="group h-full transition-transform duration-200 hover:-translate-y-0.5">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums tracking-normal text-foreground">
                    {stat.value}
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary transition-colors group-hover:bg-planetary group-hover:text-white">
                  <stat.icon className="size-4" />
                </span>
              </div>
              {stat.detail ? (
                <p className="mt-4 truncate text-xs font-medium text-muted-foreground">{stat.detail}</p>
              ) : null}
            </div>
          </SectionCard>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
