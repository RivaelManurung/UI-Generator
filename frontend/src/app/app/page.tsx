"use client";

import Link from "next/link";
import { FolderKanban, Wallet, Activity, Gauge } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { CreditWallet } from "@/components/dashboard/credit-wallet";
import { OverviewCards, type OverviewStat } from "@/components/dashboard/overview-card";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { Button } from "@/components/ui/button";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { useCreditTransactions } from "@/hooks/use-credit-transactions";
import { useProjects } from "@/hooks/use-projects";

export default function UserDashboardPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { balance, loading: balanceLoading } = useCreditBalance();
  const { transactions, loading: transactionsLoading } = useCreditTransactions();

  const avgQuality =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + (project.qualityAverage ?? 0), 0) /
            projects.length,
        )
      : 0;

  const stats: OverviewStat[] = [
    {
      label: "Projects",
      value: projects.length.toLocaleString(),
      detail: projects.length === 1 ? "1 project in workspace" : `${projects.length} projects in workspace`,
      icon: FolderKanban,
    },
    {
      label: "Credits available",
      value: (balance?.available ?? 0).toLocaleString(),
      detail: "Ready to spend on generation",
      icon: Wallet,
    },
    {
      label: "Credits used this month",
      value: (balance?.usedThisMonth ?? 0).toLocaleString(),
      detail: `of ${(balance?.monthlyLimit ?? 0).toLocaleString()} monthly limit`,
      icon: Activity,
    },
    {
      label: "Avg quality",
      value: String(avgQuality),
      detail: projects.length > 0 ? "Average across projects" : "No projects yet",
      icon: Gauge,
    },
  ];

  return (
    <AppShell title="Overview" subtitle="Workspace activity, generation, and credits.">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Generate new interfaces, track credit usage, and pick up where you left off.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/app/studio/demo">New generation</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/templates">Browse templates</Link>
            </Button>
          </div>
        </div>

        <OverviewCards stats={stats} loading={balanceLoading || projectsLoading} />

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <RecentProjects projects={projects} loading={projectsLoading} />
          </div>
          <div className="xl:col-span-5">
            <CreditWallet
              balance={balance}
              transactions={transactions}
              loading={balanceLoading || transactionsLoading}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
