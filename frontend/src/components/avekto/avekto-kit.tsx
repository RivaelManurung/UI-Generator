"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared building blocks for the Avekto replica landing page.
// Kept presentational and palette-bound (planetary tokens) so every section
// reads as one system.

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.2em] text-planetary",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-balance text-[28px] font-bold leading-[1.12] tracking-normal text-galaxy sm:text-[34px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

// A neutral browser/window chrome used for every product screenshot mock.
export function BrowserFrame({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-landing-border bg-white shadow-[0_24px_70px_rgb(20_22_28_/_10%)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-landing-border bg-meteor/50 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-galaxy/15" />
        <span className="size-2.5 rounded-full bg-galaxy/15" />
        <span className="size-2.5 rounded-full bg-galaxy/15" />
        {label ? (
          <span className="ml-2 truncate text-[10px] font-medium text-landing-text-muted">
            {label}
          </span>
        ) : null}
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

// Tiny status pill used inside mock UIs.
export function Pill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "muted";
}) {
  const tones: Record<string, string> = {
    blue: "bg-sky text-planetary",
    green: "bg-success-bg text-success-foreground",
    amber: "bg-warning-bg text-warning-foreground",
    muted: "bg-meteor text-landing-text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// Skeleton bars to suggest dense UI content without real copy.
export function Lines({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full bg-galaxy/8"
          style={{ width: `${88 - i * 14}%` }}
        />
      ))}
    </div>
  );
}
