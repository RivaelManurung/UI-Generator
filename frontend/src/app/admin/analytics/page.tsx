"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gauge, Loader2, Users, Zap } from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  const kpiCards = [
    { label: "Active users", value: kpis ? kpis.activeUsers.toLocaleString() : "—", icon: Users },
    { label: "Generation jobs", value: kpis ? kpis.generationJobs.toLocaleString() : "—", icon: Zap },
    { label: "Success rate", value: kpis ? `${kpis.successRate}%` : "—", icon: CheckCircle2 },
    { label: "Avg quality", value: kpis ? `${kpis.avgQuality}` : "—", icon: Gauge },
  ];

  const maxFunnel = funnel.reduce((max, point) => Math.max(max, point.value), 0);
  const maxCategory = categories.reduce((max, point) => Math.max(max, point.value), 0);

  return (
    <AdminShell
      title="Analytics"
      subtitle="Product metrics from the observability plan."
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading analytics…
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardDescription>{kpi.label}</CardDescription>
                    <CardTitle className="mt-2 text-3xl tracking-normal tabular-nums">{kpi.value}</CardTitle>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <kpi.icon className="size-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground">—</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generation funnel</CardTitle>
                <CardDescription>From prompt to delivered code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {funnel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No funnel data available.</p>
                ) : (
                  funnel.map((step) => {
                    const percent = maxFunnel > 0 ? Math.round((step.value / maxFunnel) * 100) : 0;
                    return (
                      <div key={step.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{step.label}</span>
                          <span className="font-medium tabular-nums">{step.value.toLocaleString()}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generations by category</CardTitle>
                <CardDescription>Distribution of generated pages across template domains.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category data available.</p>
                ) : (
                  categories.map((category, index) => (
                    <div key={category.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-muted-foreground">{category.label}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                        <div
                          className={`h-full rounded-md ${categoryColors[index % categoryColors.length]}`}
                          style={{ width: `${maxCategory > 0 ? (category.value / maxCategory) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">{category.value}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
