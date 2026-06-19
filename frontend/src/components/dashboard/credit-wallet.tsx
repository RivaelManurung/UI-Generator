"use client";

import { Progress } from "@/components/ui/progress";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditBalance, CreditTransaction } from "@/types/credit";
import { cn } from "@/lib/utils";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function CreditWallet({
  balance,
  transactions,
  loading = false,
}: {
  balance: CreditBalance | null;
  transactions: CreditTransaction[];
  loading?: boolean;
}) {
  const available = balance?.available ?? 0;
  const used = balance?.usedThisMonth ?? 0;
  const limit = balance?.monthlyLimit ?? 0;
  const usedPercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const items = transactions.slice(0, 5);

  return (
    <SectionCard className="overflow-hidden">
      <SectionCardHeader
        title="Credit wallet"
        description="Balance, monthly usage, and recent credit movement."
      />
      <div className="px-5 pb-5">
        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-planetary/15 bg-sky/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Available credits</p>
              <p className="mt-1 text-4xl font-bold tabular-nums tracking-normal text-galaxy">
                {available.toLocaleString()}
              </p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used this month</span>
                  <span className="tabular-nums">
                    {used.toLocaleString()} / {limit.toLocaleString()}
                  </span>
                </div>
                <Progress className="h-2" value={usedPercent} />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Recent transactions</p>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                </div>
              ) : (
                <ul className="grid gap-2">
                  {items.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-planetary/20 hover:bg-sky/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          tx.amount > 0 ? "text-success-foreground" : "text-muted-foreground",
                        )}
                      >
                        {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
