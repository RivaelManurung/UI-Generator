"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gauge, Layers, Loader2, Users, Zap } from "lucide-react";
import type { ComponentType } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Progress } from "@/components/ui/progress";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  adminService,
  type AnalyticsKpis,
  type AnalyticsPoint,
} from "@/lib/services/admin-service";

const categoryColors = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

interface KpiCard {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [funnel, setFunnel] = useState<AnalyticsPoint[]>([]);
  const [categories, setCategories] = useState<AnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminService.analyticsKpis(),
      adminService.analyticsFunnel(),
      adminService.analyticsCategories(),
    ])
      .then(([kpiData, funnelData, categoryData]) => {
        if (!active) return;
        setKpis(kpiData);
        setFunnel(funnelData);
        setCategories(categoryData);
      })
      .catch(() => {
        if (!active) return;
        setKpis(null);
        setFunnel([]);
        setCategories([]);
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
      icon: Zap,
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

  const maxFunnel = funnel.reduce((max, point) => Math.max(max, point.value), 0);
  const maxCategory = categories.reduce(
    (max, point) => Math.max(max, point.value),
    0,
  );

  return (
    <AdminShell
      title="Analytics"
      subtitle="Product metrics from the observability plan."
    >
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <span className="text-sm font-medium">Loading analytics…</span>
        </div>
      ) : (
        <div className="space-y-6">
          <RevealGroup
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal className="h-full">
              <SectionCard className="h-full overflow-hidden">
                <SectionCardHeader
                  title="Generation funnel"
                  description="From prompt to delivered code."
                />
                <div className="space-y-4 px-5 pb-5">
                  {funnel.length === 0 ? (
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

            <Reveal className="h-full">
              <SectionCard className="h-full overflow-hidden">
                <SectionCardHeader
                  title="Generations by category"
                  description="Distribution of generated pages across template domains."
                />
                <div className="space-y-3 px-5 pb-5">
                  {categories.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-sky/60 text-planetary">
                        <Layers className="size-5" />
                      </span>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        No category data available
                      </p>
                    </div>
                  ) : (
                    categories.map((category, index) => (
                      <div
                        key={category.label}
                        className="flex items-center gap-3"
                      >
                        <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                          {category.label}
                        </span>
                        <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                          <div
                            className={`h-full rounded-md ${categoryColors[index % categoryColors.length]}`}
                            style={{
                              width: `${maxCategory > 0 ? (category.value / maxCategory) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums tracking-normal text-foreground">
                          {category.value}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </Reveal>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
