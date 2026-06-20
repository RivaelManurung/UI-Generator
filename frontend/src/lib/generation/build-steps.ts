"use client";

import { useEffect, useState } from "react";

/**
 * Drives the analyzing → building walk used by the sidebar progress panel and
 * the live preview skeleton. The backend streams only `running → completed`, so
 * the step walk is client-side for a smooth "what is being built" narrative,
 * floored by the real batch progress. The actual step labels come from the
 * resolved layout kind (see `layout-kind.ts`) so the story matches the prompt.
 */

export const ANALYZE_MS = 1200;
export const STEP_MS = 850;

export type BuildPhase = "analyzing" | "building";

export interface BuildStepsState {
  phase: BuildPhase;
  /** Index of the step currently in progress (also the count of completed steps). */
  currentStep: number;
  steps: readonly string[];
}

export function useBuildSteps({
  total,
  failed,
  steps,
}: {
  total: number;
  failed?: boolean;
  steps: readonly string[];
}): BuildStepsState {
  const [phase, setPhase] = useState<BuildPhase>("analyzing");
  const [currentStep, setCurrentStep] = useState(0);
  const lastIndex = Math.max(0, steps.length - 1);

  useEffect(() => {
    if (total > 0) {
      setPhase("building");
      return;
    }
    const timer = setTimeout(() => setPhase("building"), ANALYZE_MS);
    return () => clearTimeout(timer);
  }, [total]);

  useEffect(() => {
    if (phase !== "building" || failed) return;
    const id = setInterval(() => {
      setCurrentStep((n) => Math.min(n + 1, lastIndex));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [phase, failed, lastIndex]);

  return { phase, currentStep: Math.min(currentStep, lastIndex), steps };
}
