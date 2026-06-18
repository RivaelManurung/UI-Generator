"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCcw, TrendingUp, Wallet } from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function typeBadge(type: AdminTransaction["type"]) {
  switch (type) {
    case "usage":
      return <Badge variant="outline">Usage</Badge>;
    case "refund":
      return (
        <Badge className="bg-success-bg text-success-foreground">Refund</Badge>
      );
    case "topup":
      return <Badge variant="secondary">Top-up</Badge>;
    case "generation":
      return <Badge variant="secondary">Generation</Badge>;
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
      className: "",
    },
    {
      label: "Credits used",
      value: summary?.creditsUsed,
      icon: CreditCard,
      className: "",
    },
    {
      label: "Refunds issued",
      value: summary?.refundsIssued,
      icon: RefreshCcw,
      className: "text-success-foreground",
    },
    {
      label: "Top-ups",
      value: summary?.topups,
      icon: TrendingUp,
      className: "",
    },
  ];

  return (
    <AdminShell
      title="Billing monitoring"
      subtitle="Credit wallet and ledger monitoring for support / admin use."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardDescription>{card.label}</CardDescription>
                <card.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p
                    className={`text-2xl font-semibold tabular-nums ${card.className}`}
                  >
                    {card.value?.toLocaleString() ?? "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading &&
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.user}</TableCell>
                        <TableCell>{typeBadge(tx.type)}</TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            tx.amount < 0
                              ? "text-destructive"
                              : "text-success-foreground"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tx.balanceAfter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading && transactions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
