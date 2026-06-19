"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CreditCard,
  FolderKanban,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/lib/services/admin-service";
import type {
  AdminProject,
  AdminUserOverview,
  AdminUserPayment,
  AdminUserTransaction,
} from "@/lib/services/admin-service";
import type { GenerationJob } from "@/lib/api/types";

function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function roleBadge(role: string) {
  if (role === "admin" || role === "owner") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-planetary/20 bg-sky/60 text-planetary capitalize"
      >
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        {role}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground capitalize">
      {role || "user"}
    </Badge>
  );
}

function statusBadge(status: string) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-success-border bg-success-bg text-success-foreground">
        Active
      </Badge>
    );
  }
  if (status === "review") {
    return (
      <Badge variant="outline" className="border-warning-border bg-warning-bg text-warning-foreground">
        Review
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
        Suspended
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground capitalize">
      {status || "—"}
    </Badge>
  );
}

function paymentStatusBadge(status: string) {
  const value = status.toLowerCase();
  if (value === "paid" || value === "settlement" || value === "capture") {
    return (
      <Badge variant="outline" className="border-success-border bg-success-bg text-success-foreground capitalize">
        {status}
      </Badge>
    );
  }
  if (value === "pending") {
    return (
      <Badge variant="outline" className="border-warning-border bg-warning-bg text-warning-foreground capitalize">
        {status}
      </Badge>
    );
  }
  if (value === "failed" || value === "expire" || value === "expired" || value === "cancel" || value === "deny") {
    return (
      <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive capitalize">
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground capitalize">
      {status || "—"}
    </Badge>
  );
}

function generationStatusBadge(status: GenerationJob["status"]) {
  switch (status) {
    case "succeeded":
      return <Badge className="bg-success-bg text-success-foreground">Succeeded</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "processing":
      return <Badge className="bg-sky/60 text-planetary">Processing</Badge>;
    default:
      return <Badge className="bg-warning-bg text-warning-foreground">Queued</Badge>;
  }
}

function projectStatusBadge(status: AdminProject["status"]) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-success-border bg-success-bg text-success-foreground">
        Active
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge variant="outline" className="border-warning-border bg-warning-bg text-warning-foreground">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground capitalize">
      {status}
    </Badge>
  );
}

type KpiTone = "planetary" | "neutral";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  tone?: KpiTone;
}) {
  return (
    <SectionCard className="h-full">
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-normal text-galaxy">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={
            tone === "planetary"
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-planetary text-white"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky/60 text-planetary"
          }
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </SectionCard>
  );
}

function TableEmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [overview, setOverview] = useState<AdminUserOverview | null>(null);
  const [payments, setPayments] = useState<AdminUserPayment[]>([]);
  const [transactions, setTransactions] = useState<AdminUserTransaction[]>([]);
  const [generations, setGenerations] = useState<GenerationJob[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, paymentsData, transactionsData, generationsData, projectsData] =
        await Promise.all([
          adminService.getUserOverview(id),
          adminService.getUserPayments(id),
          adminService.getUserTransactions(id),
          adminService.getUserGenerations(id),
          adminService.getUserProjects(id),
        ]);
      setOverview(overviewData);
      setPayments(paymentsData);
      setTransactions(transactionsData);
      setGenerations(generationsData);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isSuspended = overview?.status === "suspended";

  async function changeStatus(nextStatus: "active" | "suspended") {
    if (!overview) return;
    setActionBusy(true);
    try {
      await adminService.updateUser(id, { status: nextStatus });
      toast.success(nextStatus === "suspended" ? "User suspended" : "User reactivated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionBusy(false);
    }
  }

  async function changeRole(nextRole: "user" | "admin") {
    if (!overview) return;
    setActionBusy(true);
    try {
      await adminService.updateUser(id, { role: nextRole });
      toast.success(nextRole === "admin" ? "Promoted to admin" : "Demoted to user");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionBusy(false);
    }
  }

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading || actionBusy}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
        <Button size="sm" asChild>
          <Link href={`/admin/users/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>
    ),
    [actionBusy, id, load, loading],
  );

  return (
    <AdminShell
      title="User detail"
      subtitle="Profile, wallet, top-ups, credit usage, and generated work."
      actions={headerActions}
    >
      <div className="mb-5">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>

      {error ? (
        <SectionCard className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Couldn’t load this user</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </SectionCard>
      ) : loading ? (
        <div className="grid gap-6">
          <SectionCard>
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-9 w-40" />
            </CardContent>
          </SectionCard>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : overview ? (
        <div className="grid gap-6">
          {/* Profile header */}
          <Reveal>
            <SectionCard>
              <CardContent className="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar className="size-14 shrink-0">
                    <AvatarFallback className="bg-sky/60 text-base font-semibold text-planetary">
                      {initials(overview.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold tracking-normal text-foreground">
                        {overview.name || "Unnamed user"}
                      </h2>
                      {roleBadge(overview.role)}
                      {statusBadge(overview.status)}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{overview.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      Joined {formatDate(overview.createdAt)} · ID {overview.id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {overview.role === "admin" || overview.role === "owner" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void changeRole("user")}
                      disabled={actionBusy || overview.role === "owner"}
                    >
                      <ShieldOff className="h-4 w-4" />
                      Demote to user
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void changeRole("admin")}
                      disabled={actionBusy}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Make admin
                    </Button>
                  )}
                  {isSuspended ? (
                    <Button
                      size="sm"
                      onClick={() => void changeStatus("active")}
                      disabled={actionBusy}
                    >
                      {actionBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Unblock
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void changeStatus("suspended")}
                      disabled={actionBusy}
                    >
                      {actionBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      Suspend / block
                    </Button>
                  )}
                </div>
              </CardContent>
            </SectionCard>
          </Reveal>

          {/* KPI row */}
          <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4" stagger={0.05}>
            <RevealItem>
              <KpiCard
                label="Wallet balance"
                value={`${formatNumber(overview.walletBalance)} cr`}
                hint="Current available credits"
                icon={Wallet}
                tone="planetary"
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Total topped up"
                value={formatIdr(overview.totalToppedUpIdr)}
                hint={`${formatNumber(overview.totalCreditsPurchased)} credits purchased`}
                icon={CreditCard}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Credits consumed"
                value={formatNumber(overview.totalCreditsConsumed)}
                hint="Lifetime usage"
                icon={Sparkles}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Generations"
                value={formatNumber(overview.generations)}
                hint={`${formatNumber(overview.projects)} projects · ${formatNumber(overview.pages)} pages`}
                icon={FolderKanban}
              />
            </RevealItem>
          </RevealGroup>

          {/* Top-up history */}
          <Reveal>
            <SectionCard>
              <SectionCardHeader
                title="Top-up history"
                description="Real-money credit purchases via Midtrans."
              />
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Order</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableEmptyRow colSpan={6} label="No top-ups yet." />
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.orderId} className="hover:bg-sky/30">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {payment.orderId}
                            </TableCell>
                            <TableCell className="capitalize">
                              {payment.packageSlug || "—"}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-galaxy">
                              {formatIdr(payment.amountIdr)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(payment.credits)}
                            </TableCell>
                            <TableCell>{paymentStatusBadge(payment.status)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {formatDateTime(payment.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </SectionCard>
          </Reveal>

          {/* Credit usage */}
          <Reveal>
            <SectionCard>
              <SectionCardHeader
                title="Credit usage"
                description="Ledger of credit movements for this account."
              />
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance after</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableEmptyRow colSpan={5} label="No credit activity yet." />
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id} className="hover:bg-sky/30">
                            <TableCell className="capitalize">{tx.type}</TableCell>
                            <TableCell className="max-w-[20rem] truncate text-muted-foreground">
                              {tx.description || "—"}
                            </TableCell>
                            <TableCell
                              className={
                                tx.amount < 0
                                  ? "text-right font-semibold tabular-nums text-destructive"
                                  : "text-right font-semibold tabular-nums text-success-foreground"
                              }
                            >
                              {tx.amount > 0 ? `+${formatNumber(tx.amount)}` : formatNumber(tx.amount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-galaxy">
                              {formatNumber(tx.balanceAfter)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {formatDateTime(tx.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </SectionCard>
          </Reveal>

          {/* Generations + Projects */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Reveal>
              <SectionCard className="h-full">
                <SectionCardHeader
                  title="Generations"
                  description="What this user generated."
                />
                <CardContent className="pt-0">
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Retries</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                          <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generations.length === 0 ? (
                          <TableEmptyRow colSpan={4} label="No generations yet." />
                        ) : (
                          generations.map((job) => (
                            <TableRow key={job.id} className="hover:bg-sky/30">
                              <TableCell>{generationStatusBadge(job.status)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {job.retryCount}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {job.duration}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums">
                                {formatDateTime(job.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <Reveal>
              <SectionCard className="h-full">
                <SectionCardHeader
                  title="Projects"
                  description="Projects owned by this user."
                />
                <CardContent className="pt-0">
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Pages</TableHead>
                          <TableHead className="text-right">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.length === 0 ? (
                          <TableEmptyRow colSpan={4} label="No projects yet." />
                        ) : (
                          projects.map((project) => (
                            <TableRow key={project.id} className="hover:bg-sky/30">
                              <TableCell className="min-w-0">
                                <p className="truncate font-medium text-foreground">{project.name}</p>
                                {project.domain ? (
                                  <p className="truncate text-xs text-muted-foreground capitalize">
                                    {project.domain}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell>{projectStatusBadge(project.status)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {project.pagesCount}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums">
                                {formatDate(project.updatedAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
