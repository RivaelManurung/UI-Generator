"use client";

import { useState } from "react";
import { CreditCard, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CreditBalance, CreditTransaction } from "@/types/credit";

interface BillingSettingsProps {
  balance: CreditBalance | null;
  transactions: CreditTransaction[];
  onTopUp: (amount: number) => Promise<any>;
}

export function BillingSettings({ balance, transactions, onTopUp }: BillingSettingsProps) {
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const credits = balance?.available ?? 0;
  const monthlyLimit = balance?.monthlyLimit ?? 100;
  const creditUsage = Math.round((credits / monthlyLimit) * 100);

  async function handleTopUp() {
    setTopUpLoading(true);
    try {
      // Mock top up 100 credits
      await onTopUp(100);
      alert("Added 100 credits to balance (Stripe checkout mockup succeeded).");
    } catch (err) {
      console.error(err);
    } finally {
      setTopUpLoading(false);
    }
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setUpgradeLoading(false);
    alert("Workspace successfully upgraded to Enterprise plan (Mocked).");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
          <CardDescription>Monitor generation credit usage and transactions.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Available credits</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{credits}</p>
              </div>

              <Badge variant="secondary">Pro plan</Badge>
            </div>

            <Progress className="mt-5" value={creditUsage} />

            <div className="mt-2 flex justify-between text-xs text-muted-foreground font-medium">
              <span>{creditUsage}% monthly allowance remaining</span>
              <span>{monthlyLimit} monthly credits</span>
            </div>
          </div>

          <div className="grid gap-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {transaction.description ?? transaction.reference}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {transaction.createdAt ?? transaction.date}
                  </p>
                </div>

                <Badge
                  variant={transaction.amount > 0 ? "secondary" : "outline"}
                  className="font-mono text-xs"
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.amount}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Current subscription and top-up actions.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Pro</p>
              <Badge variant="secondary" className="text-[10px]">Active</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-5 font-medium">
              Includes generation credits, API access, preview export, and saved projects.
            </p>
          </div>

          <Button onClick={handleTopUp} disabled={topUpLoading} className="w-full">
            {topUpLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Top up credits
          </Button>

          <Button variant="outline" onClick={handleUpgrade} disabled={upgradeLoading} className="w-full">
            {upgradeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Upgrade plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
