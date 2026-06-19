"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Gauge, Users } from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import type { GenerationJob } from "@/lib/api/types";
import {
  adminService,
  type AnalyticsKpis,
  type AnalyticsPoint,
} from "@/lib/services/admin-service";

function statusBadge(status: GenerationJob["status"]) {
  switch (status) {
    case "succeeded":
      return (
        <Badge
          variant="outline"
          className="border-success-border bg-success-bg text-success-foreground"
        >
          Succeeded
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive"
        >
          Failed
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className="border-info-border bg-info-bg text-info-foreground"
        >
          Processing
        </Badge>
      );
    case "queued":
      return (
        <Badge
          variant="outline"
          className="border-warning-border bg-warning-bg text-warning-foreground"
        >
          Queued
        </Badge>
      );
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

interface KpiCard {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}

export function DashboardOverview() {
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [funnel, setFunnel] = useState<AnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminService.analyticsKpis(),
      adminService.listGenerationJobs(),
      adminService.analyticsFunnel(),
    ])
      .then(([kpiData, jobData, funnelData]) => {
        if (!active) return;
        setKpis(kpiData);
        setJobs(jobData);
        setFunnel(funnelData);
      })
      .catch(() => {
        if (!active) return;
        setKpis(null);
        setJobs([]);
        setFunnel([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const kpiCards: KpiCard[] = [
    {
      label: "Active users",
      value: kpis ? kpis.activeUsers.toLocaleString() : "—",
      icon: Users,
    },
    {
      label: "Generation jobs",
      value: kpis ? kpis.generationJobs.toLocaleString() : "—",
      icon: Activity,
    },
    {
      label: "Success rate",
      value: kpis ? `${kpis.successRate}%` : "—",
      icon: CheckCircle2,
    },
    {
      label: "Avg quality",
      value: kpis ? `${kpis.avgQuality}` : "—",
      icon: Gauge,
    },
  ];

  const recentJobs = jobs.slice(0, 6);
  const maxFunnel = funnel.reduce((max, point) => Math.max(max, point.value), 0);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <RevealGroup
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          stagger={0.05}
        >
          {kpiCards.map((kpi) => (
            <RevealItem className="h-full" key={kpi.label}>
              <SectionCard className="group h-full transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold tabular-nums tracking-normal text-foreground">
                        {kpi.value}
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary transition-colors group-hover:bg-planetary group-hover:text-white">
                      <kpi.icon className="size-4" />
                    </span>
                  </div>
                </div>
              </SectionCard>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal className="h-full">
          <SectionCard className="h-full overflow-hidden">
            <SectionCardHeader
              title="Recent generations"
              description="Latest generation jobs across the platform."
            />
            <div className="px-5 pb-5">
              {loading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={`job-skeleton-${index}`}
                      className="h-14 rounded-xl"
                    />
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary">
                    <Activity className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No generations yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jobs will appear here as users generate interfaces.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-2">
                  {recentJobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-planetary/30 hover:shadow-brand-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {job.project}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </p>
                      </div>
                      {statusBadge(job.status)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        </Reveal>

        <Reveal className="h-full">
          <SectionCard className="h-full overflow-hidden">
            <SectionCardHeader
              title="Generation funnel"
              description="From prompt to delivered code."
            />
            <div className="space-y-4 px-5 pb-5">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`funnel-skeleton-${index}`}
                    className="h-9 w-full rounded-lg"
                  />
                ))
              ) : funnel.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary">
                    <Gauge className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No funnel data available
                  </p>
                </div>
              ) : (
                funnel.map((step) => {
                  const percent =
                    maxFunnel > 0
                      ? Math.round((step.value / maxFunnel) * 100)
                      : 0;
                  return (
                    <div key={step.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {step.label}
                        </span>
                        <span className="font-bold tabular-nums tracking-normal text-foreground">
                          {step.value.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </Reveal>
      </div>
    </div>
  );
}
