"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { useCreditTransactions } from "@/hooks/use-credit-transactions";
import type { CreditTransaction } from "@/types/credit";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof ArrowUpRight> = {
  usage: ArrowDownLeft,
  generation: ArrowDownLeft,
  refund: RotateCcw,
  topup: ArrowUpRight,
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function typeBadgeVariant(type: CreditTransaction["type"]): "outline" | "secondary" {
  return type === "usage" || type === "generation" ? "outline" : "secondary";
}

const statusStyles: Record<CreditTransaction["status"], string> = {
  succeeded: "bg-secondary text-secondary-foreground",
  pending: "bg-warning-bg text-warning-foreground",
  failed: "bg-destructive/10 text-destructive",
};

const TX_PAGE_SIZE = 8;

export default function BillingPage() {
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useCreditBalance();
  const { transactions, loading: txLoading } = useCreditTransactions();
  const [page, setPage] = useState(1);

  const usedPercent =
    balance && balance.monthlyLimit > 0
      ? Math.min(100, Math.round((balance.usedThisMonth / balance.monthlyLimit) * 100))
      : 0;

  // Client-side pagination for the usage/transaction list. `safePage` clamps the
  // current page so the view stays valid if the list shrinks (e.g. after reload).
  const pageCount = Math.max(1, Math.ceil(transactions.length / TX_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * TX_PAGE_SIZE;
  const pageItems = transactions.slice(pageStart, pageStart + TX_PAGE_SIZE);

  return (
    <AppShell title="Billing" subtitle="Credits, top-ups, and transaction history.">
      <RevealGroup className="grid gap-5 md:grid-cols-2" stagger={0.05}>
        <RevealItem>
          <Card className="group h-full border-planetary/15 bg-sky/40 transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription>Available credits</CardDescription>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky/60 text-planetary transition group-hover:bg-planetary group-hover:text-white"
                  aria-hidden="true"
                >
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums tracking-normal text-galaxy">
                {balanceLoading ? "—" : (balance?.available ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Ready to spend on generations.</p>
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="group h-full transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription>Used this month</CardDescription>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky/60 text-planetary transition group-hover:bg-planetary group-hover:text-white"
                  aria-hidden="true"
                >
                  <Receipt className="h-4 w-4" />
                </span>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums tracking-normal">
                {balanceLoading ? (
                  "—"
                ) : (
                  <>
                    {balance?.usedThisMonth ?? 0}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / {balance?.monthlyLimit ?? 0}
                    </span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={usedPercent} className="bg-muted" aria-label="Monthly credit usage" />
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {usedPercent}% of monthly limit
              </p>
            </CardContent>
          </Card>
        </RevealItem>
      </RevealGroup>

      <Reveal className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold tracking-normal">Buy credits</CardTitle>
            <CardDescription>One-time top-up packs — credits never expire. Paid securely via Midtrans.</CardDescription>
          </CardHeader>
          <CardContent>
            <PricingPlans redirectTo="/app/billing" onPaid={refreshBalance} />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold tracking-normal">Transaction history</CardTitle>
            <CardDescription>Usage, refunds, and top-up activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                <span
                  className="h-6 w-6 animate-spin rounded-full border-2 border-planetary/25 border-t-planetary"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">Loading transactions…</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                <span
                  className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-sky/60 text-planetary"
                  aria-hidden="true"
                >
                  <Receipt className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">Usage and top-ups will appear here.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance after</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((tx) => {
                      const TypeIcon = typeIcons[tx.type] ?? ArrowUpRight;
                      const isNegative = tx.amount < 0;
                      return (
                        <TableRow key={tx.id} className="group transition-colors hover:bg-sky/30">
                          <TableCell className="text-muted-foreground tabular-nums">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeBadgeVariant(tx.type)} className="capitalize">
                              <TypeIcon className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-planetary" />
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-bold tabular-nums tracking-normal",
                              isNegative ? "text-destructive" : "text-galaxy",
                            )}
                          >
                            {isNegative ? tx.amount : `+${tx.amount}`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{tx.balanceAfter}</TableCell>
                          <TableCell className="max-w-[280px] truncate text-foreground">
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("capitalize", statusStyles[tx.status])}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>

                {pageCount > 1 ? (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Showing {pageStart + 1}–{Math.min(pageStart + TX_PAGE_SIZE, transactions.length)} of{" "}
                      {transactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <span className="px-1 text-xs font-medium text-muted-foreground tabular-nums">
                        Page {safePage} of {pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={safePage >= pageCount}
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </AppShell>
  );
}
