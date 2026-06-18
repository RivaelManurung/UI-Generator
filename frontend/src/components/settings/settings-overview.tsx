"use client";

import { BadgeCheck, CreditCard, KeyRound, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsOverviewProps {
  credits: number;
  monthlyLimit: number;
  apiKeyCount: number;
  safeMode: boolean;
}

export function SettingsOverview({
  credits,
  monthlyLimit,
  apiKeyCount,
  safeMode,
}: SettingsOverviewProps) {
  const usage = Math.round((credits / monthlyLimit) * 100);

  const items = [
    {
      label: "Plan",
      value: "Pro",
      description: "Active workspace",
      icon: BadgeCheck,
    },
    {
      label: "Credits",
      value: String(credits),
      description: `${usage}% allowance remaining`,
      icon: CreditCard,
    },
    {
      label: "API keys",
      value: String(apiKeyCount),
      description: "Active server keys",
      icon: KeyRound,
    },
    {
      label: "Safe mode",
      value: safeMode ? "On" : "Off",
      description: "Component registry enforced",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold tracking-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
