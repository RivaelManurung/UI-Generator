"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useGeneration } from "./generation-provider";

export function GenerationIndicator() {
  const { active } = useGeneration();

  if (!active) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[280px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-foreground shadow-lg">
      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">
          Generating {active.completed}/{active.total} pages…
        </p>
        <Link
          href="/app/studio/demo"
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Open studio
        </Link>
      </div>
    </div>
  );
}
