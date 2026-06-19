"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Receipt,
  RefreshCcw,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminService,
  type AdminBillingSummary,
  type AdminTransaction,
} from "@/lib/services/admin-service";
import { cn } from "@/lib/utils";

const typeIcons: Record<AdminTransaction["type"], typeof ArrowUpRight> = {
  usage: ArrowDownLeft,
  generation: ArrowDownLeft,
  refund: RotateCcw,
  topup: ArrowUpRight,
};

function typeBadge(type: AdminTransaction["type"]) {
  switch (type) {
    case "usage":
      return <Badge variant="outline">Usage</Badge>;
    case "refund":
      return (
        <Badge className="bg-success-bg text-success-foreground">Refund</Badge>
      );
    case "topup":
      return <Badge className="bg-sky/60 text-planetary">Top-up</Badge>;
    case "generation":
      return <Badge variant="outline">Generation</Badge>;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export default function AdminBillingPage() {
  const [summary, setSummary] = useState<AdminBillingSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([adminService.billingSummary(), adminService.transactions()])
      .then(([summaryData, txData]) => {
        if (!active) return;
        setSummary(summaryData);
        setTransactions(txData);
      })
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setTransactions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      label: "Total balance",
      value: summary?.totalBalance,
      icon: Wallet,
      valueClass: "text-galaxy",
    },
    {
      label: "Credits used",
      value: summary?.creditsUsed,
      icon: CreditCard,
      valueClass: "text-foreground",
    },
    {
      label: "Refunds issued",
      value: summary?.refundsIssued,
      icon: RefreshCcw,
      valueClass: "text-galaxy",
    },
    {
      label: "Top-ups",
      value: summary?.topups,
      icon: TrendingUp,
      valueClass: "text-foreground",
    },
  ];

  return (
    <AdminShell
      title="Billing monitoring"
      subtitle="Credit wallet and ledger monitoring for support / admin use."
    >
      <div className="space-y-6">
        <RevealGroup
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          stagger={0.05}
        >
          {cards.map((card) => (
            <RevealItem className="h-full" key={card.label}>
              <Card className="group h-full transition-transform duration-200 hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardDescription>{card.label}</CardDescription>
                  <span
                    className="flex size-9 items-center justify-center rounded-xl bg-sky/60 text-planetary transition-colors group-hover:bg-planetary group-hover:text-white"
                    aria-hidden="true"
                  >
                    <card.icon className="size-4" />
                  </span>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p
                      className={cn(
                        "text-3xl font-bold tabular-nums tracking-normal",
                        card.valueClass,
                      )}
                    >
                      {card.value?.toLocaleString() ?? "—"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal>
          <Card>
            <CardHeader className="space-y-1">
              <CardDescription className="text-sm font-bold tracking-normal text-foreground">
                Transaction ledger
              </CardDescription>
              <CardDescription>
                Usage, refunds, top-ups, and resulting balances across all
                accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">
                          Balance after
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                  <span
                    className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-sky/60 text-planetary"
                    aria-hidden="true"
                  >
                    <Receipt className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    No transactions yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Usage, refunds, and top-ups will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">
                          Balance after
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => {
                        const TypeIcon = typeIcons[tx.type] ?? ArrowUpRight;
                        const isNegative = tx.amount < 0;
                        return (
                          <TableRow
                            key={tx.id}
                            className="group transition-colors hover:bg-sky/30"
                          >
                            <TableCell className="font-medium text-foreground">
                              {tx.user}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5">
                                <TypeIcon
                                  className="size-3.5 text-muted-foreground transition-colors group-hover:text-planetary"
                                  aria-hidden="true"
                                />
                                {typeBadge(tx.type)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-bold tabular-nums tracking-normal",
                                isNegative
                                  ? "text-destructive"
                                  : "text-galaxy",
                              )}
                            >
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {tx.balanceAfter.toLocaleString()}
                            </TableCell>
                            <TableCell className="max-w-[280px] truncate text-muted-foreground">
                              {tx.description}
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">
                              {formatDate(tx.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </AdminShell>
  );
}
