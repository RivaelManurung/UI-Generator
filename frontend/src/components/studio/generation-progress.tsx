"use client";

import { Check, Loader2, Sparkles } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { useBuildSteps } from "@/lib/generation/build-steps";
import type { LayoutKind } from "@/lib/generation/layout-kind";
import { stepsForKind } from "@/lib/generation/layout-kind";
import { cn } from "@/lib/utils";

/**
 * Sidebar progress panel shown while a generation runs. It opens with an
 * "Analyzing…" phase, then walks an illustrative build checklist (what is being
 * assembled) with a progress bar. The walk is time-driven for a smooth feel but
 * is floored by the real batch progress (`completed`/`total`) so it never lags
 * behind the actual work.
 */

type StepState = "done" | "active" | "idle";

interface GenerationProgressProps {
  prompt: string;
  completed: number;
  total: number;
  kind: LayoutKind;
  failed?: boolean;
}

const KIND_NOUN: Record<LayoutKind, string> = {
  auth: "auth flow",
  dashboard: "dashboard",
  table: "data view",
  form: "form",
  generic: "layout",
};

export function GenerationProgress({ prompt, completed, total, kind, failed }: GenerationProgressProps) {
  const steps = stepsForKind(kind);
  const { phase, currentStep } = useBuildSteps({ total, failed, steps });
  const doneSteps = currentStep;

  const realPct = total > 0 ? (completed / total) * 100 : 0;
  const timedPct =
    phase === "analyzing" ? 8 : 12 + (doneSteps / steps.length) * 80;
  const pct = failed
    ? 100
    : Math.min(95, Math.max(Math.round(timedPct), Math.round(realPct)));

  const headline = failed
    ? "Generation failed"
    : phase === "analyzing"
      ? "Analyzing prompt…"
      : `Generating ${KIND_NOUN[kind]}…`;

  return (
    <div className="space-y-3">
      {/* Approved prompt */}
      <div className="rounded-xl border border-success-border bg-success-bg/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-success-foreground">
          <Check className="size-3.5" aria-hidden />
          Prompt approved
        </div>
        <div className="mt-2 rounded-lg border border-border bg-card p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Using prompt
          </p>
          <p className="mt-1 line-clamp-4 text-xs leading-5 text-foreground">{prompt}</p>
        </div>
      </div>

      {/* Live build progress */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold",
              failed ? "text-destructive" : "text-primary",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {headline}
          </span>
          {!failed ? (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {total > 0 ? `${completed}/${total}` : "Streaming…"}
            </span>
          ) : null}
        </div>

        <Progress value={pct} className="mt-2.5 h-1.5" />
        <p className="mt-1 text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</p>

        {phase === "building" && !failed ? (
          <ul className="mt-3 space-y-1.5" aria-label="Build steps">
            {steps.map((label, index) => {
              const state: StepState =
                index < doneSteps ? "done" : index === doneSteps ? "active" : "idle";
              return (
                <li key={label} className="flex items-center gap-2 text-xs">
                  <StepIcon state={state} />
                  <span
                    className={cn(
                      "truncate",
                      state === "idle"
                        ? "text-muted-foreground"
                        : state === "active"
                          ? "font-semibold text-foreground"
                          : "text-foreground",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : failed ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Something went wrong while building. Adjust your prompt and try again.
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            Understanding your requirements…
          </div>
        )}
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-hidden
      >
        <Check className="size-2.5" />
      </span>
    );
  }
  if (state === "active") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />;
  }
  return <span className="size-4 shrink-0 rounded-full border-2 border-border" aria-hidden />;
}
