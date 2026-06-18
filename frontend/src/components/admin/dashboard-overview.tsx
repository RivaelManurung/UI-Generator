"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Gauge, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
        <Badge className="bg-success-bg text-success-foreground">Succeeded</Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "processing":
      return <Badge variant="secondary">Processing</Badge>;
    case "queued":
      return <Badge variant="secondary">Queued</Badge>;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
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

  const kpiCards = [
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardDescription>{kpi.label}</CardDescription>
              <kpi.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent generations</CardTitle>
            <CardDescription>Latest generation jobs across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading &&
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`job-skeleton-${index}`} className="h-10 w-full" />
              ))}

            {!loading &&
              recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.project}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                  {statusBadge(job.status)}
                </div>
              ))}

            {!loading && recentJobs.length === 0 && (
              <p className="text-sm text-muted-foreground">No generations yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation funnel</CardTitle>
            <CardDescription>From prompt to delivered code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`funnel-skeleton-${index}`} className="h-8 w-full" />
              ))}

            {!loading &&
              funnel.map((step) => {
                const percent =
                  maxFunnel > 0 ? Math.round((step.value / maxFunnel) * 100) : 0;
                return (
                  <div key={step.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-medium tabular-nums">
                        {step.value.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}

            {!loading && funnel.length === 0 && (
              <p className="text-sm text-muted-foreground">No funnel data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
