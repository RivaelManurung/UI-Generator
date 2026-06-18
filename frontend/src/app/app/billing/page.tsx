"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
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
  pending: "bg-secondary text-secondary-foreground",
  failed: "bg-destructive/10 text-destructive",
};

export default function BillingPage() {
  const { balance, purchaseCredits, loading: balanceLoading } = useCreditBalance();
  const { transactions, loading: txLoading } = useCreditTransactions();

  const usedPercent =
    balance && balance.monthlyLimit > 0
      ? Math.min(100, Math.round((balance.usedThisMonth / balance.monthlyLimit) * 100))
      : 0;

  const handleTopUp = async () => {
    try {
      await purchaseCredits(100);
      toast.success("Added 100 credits to your balance.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top up failed");
    }
  };

  const topUpAction = (
    <Button size="sm" onClick={handleTopUp} disabled={balanceLoading}>
      <CreditCard className="h-4 w-4" />
      Top up
    </Button>
  );

  return (
    <AppShell
      title="Billing"
      subtitle="Credits and transaction history."
      actions={topUpAction}
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Available credits</CardDescription>
            <CardTitle className="text-3xl tabular-nums tracking-normal text-foreground">
              {balanceLoading ? "—" : (balance?.available ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ready to spend on generations.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Used this month</CardDescription>
            <CardTitle className="text-3xl tabular-nums tracking-normal">
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
            <Progress value={usedPercent} className="bg-muted" />
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {usedPercent}% of monthly limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Top up balance</CardDescription>
            <CardTitle className="text-xl tracking-normal">Add credits instantly</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-primary text-primary-foreground" onClick={handleTopUp} disabled={balanceLoading}>
              <CreditCard className="h-4 w-4" />
              Top up 100 credits
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="tracking-normal">Transaction history</CardTitle>
          <CardDescription>Usage, refunds, and top-up activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading transactions…</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm font-medium text-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Usage and top-ups will appear here.</p>
            </div>
          ) : (
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
                  {transactions.map((tx) => {
                    const TypeIcon = typeIcons[tx.type] ?? ArrowUpRight;
                    const isNegative = tx.amount < 0;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant(tx.type)} className="capitalize">
                            <TypeIcon className="h-3 w-3" />
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            isNegative ? "text-destructive" : "text-foreground",
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
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
