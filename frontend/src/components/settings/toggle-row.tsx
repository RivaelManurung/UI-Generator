"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}

export function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
