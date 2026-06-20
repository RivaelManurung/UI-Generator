"use client";

import { Loader2, Sparkles } from "lucide-react";

import { useBuildSteps } from "@/lib/generation/build-steps";
import {
  authVariantFrom,
  stepsForKind,
  type AuthVariant,
  type LayoutKind,
} from "@/lib/generation/layout-kind";
import { cn } from "@/lib/utils";

/**
 * Live progressive preview shown in place of a not-yet-rendered screen. It draws
 * the SAME shell the renderer will produce for this layout kind — a centered
 * glass auth card for auth pages, the admin shell (sidebar + sections) for the
 * rest — and assembles it region-by-region in lockstep with the build steps, so
 * the user watches the real layout take shape (not a generic dashboard).
 *
 * Rendered at the same logical width/height/scale as the finished iframe so the
 * swap to the real page is seamless.
 */

interface LivePreviewSkeletonProps {
  kind: LayoutKind;
  /** Screen name (used to pick the auth sub-variant: login / register / forgot). */
  screenName?: string;
  pageType?: string;
  total: number;
  /** Logical (unscaled) width/height + scale, mirrored from the real iframe. */
  width: number;
  height: number;
  scale: number;
}

export function LivePreviewSkeleton({
  kind,
  screenName,
  pageType,
  total,
  width,
  height,
  scale,
}: LivePreviewSkeletonProps) {
  const steps = stepsForKind(kind);
  const { phase, currentStep } = useBuildSteps({ total, steps });

  const caption =
    phase === "analyzing" ? "Analyzing your prompt…" : `Building ${steps[currentStep].toLowerCase()}…`;

  return (
    <div className="relative size-full overflow-hidden bg-meteor">
      {/* Live status pill (matches the studio "Generating live preview…" badge). */}
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-planetary/20 bg-white/95 px-4 py-1.5 text-sm font-semibold text-planetary shadow-brand-sm backdrop-blur">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Generating live preview…
      </div>

      <div
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="bg-white"
        aria-label={caption}
        role="img"
      >
        {kind === "mobile" ? (
          <MobileShell step={currentStep} />
        ) : kind === "auth" ? (
          <AuthShell step={currentStep} variant={authVariantFrom(screenName, pageType)} />
        ) : (
          <AdminShell kind={kind} step={currentStep} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auth: centered glass card on a gradient (mirrors renderAuthForm)    */
/* ------------------------------------------------------------------ */

function AuthShell({ step, variant }: { step: number; variant: AuthVariant }) {
  // Step map: 1 card · 2 brand+heading · 3 fields · 4 social
  const title =
    variant === "register" ? "Create Account" : variant === "forgot" ? "Reset Password" : "Welcome Back";
  const subtitle =
    variant === "register"
      ? "Start building with your new account"
      : variant === "forgot"
        ? "Enter your email to receive a reset link"
        : "Sign in to continue to your workspace";

  const fieldCount = variant === "register" ? 4 : variant === "forgot" ? 1 : 2;

  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky via-white to-venus/50 p-8">
      {/* soft gradient blobs for depth */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-planetary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 size-80 rounded-full bg-universe/15 blur-3xl" />

      <Region revealed={step >= 1} active={step === 1}>
        <div className="w-[420px] rounded-2xl border border-white/70 bg-white/75 p-8 shadow-[0_24px_70px_rgba(8,31,92,0.16)] backdrop-blur-xl">
          {/* brand + heading */}
          <Region revealed={step >= 2} active={step === 2}>
            <div className="flex flex-col items-center text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-planetary text-white shadow-brand-sm">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="mt-4 text-xl font-bold text-galaxy">{title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </Region>

          {/* fields */}
          <Region revealed={step >= 3} active={step === 3}>
            <div className="mt-6 space-y-4">
              {Array.from({ length: fieldCount }).map((_, i) => (
                <Field key={i} withToggle={variant !== "forgot" && i >= fieldCount - 1} />
              ))}
              {variant === "login" ? (
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded border border-galaxy/20 bg-white" />
                    <Bar className="h-2.5 w-24" tone="faint" />
                  </div>
                  <Bar className="h-2.5 w-28" tone="normal" />
                </div>
              ) : null}
              {variant === "register" ? (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="size-4 rounded border border-galaxy/20 bg-white" />
                  <Bar className="h-2.5 w-48" tone="faint" />
                </div>
              ) : null}
              <div className="h-11 w-full rounded-xl bg-planetary shadow-brand-sm" />
            </div>
          </Region>

          {/* social sign-in (login + register only) */}
          {variant !== "forgot" ? (
            <Region revealed={step >= 4} active={step === 4}>
              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-galaxy/10" />
                  <Bar className="h-2.5 w-28" tone="faint" />
                  <div className="h-px flex-1 bg-galaxy/10" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-10 rounded-xl border border-galaxy/10 bg-white" />
                  <div className="h-10 rounded-xl border border-galaxy/10 bg-white" />
                </div>
              </div>
            </Region>
          ) : null}

          <div className="mt-6 flex justify-center">
            <Bar className="h-2.5 w-44" tone="faint" />
          </div>
        </div>
      </Region>
    </div>
  );
}

function Field({ withToggle }: { withToggle?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Bar className="h-2.5 w-20" tone="faint" />
      <div className="relative flex h-11 items-center rounded-xl border border-galaxy/12 bg-white px-3">
        <Bar className="h-2.5 w-32" tone="faint" />
        {withToggle ? (
          <span className="absolute right-3 size-4 rounded bg-galaxy/10" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile shell: status bar + app bar + stacked cards + bottom tab bar */
/* (mirrors the phone preview the renderer produces — NO sidebar)      */
/* ------------------------------------------------------------------ */

function MobileShell({ step }: { step: number }) {
  return (
    <div className="flex size-full flex-col bg-meteor">
      {/* status bar */}
      <div className="flex items-center justify-between px-5 pb-1 pt-3">
        <Bar className="h-2.5 w-8" tone="strong" />
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-galaxy/20" />
          <div className="size-2.5 rounded-sm bg-galaxy/20" />
          <div className="h-2.5 w-4 rounded-sm bg-galaxy/20" />
        </div>
      </div>

      {/* app bar */}
      <Region revealed={step >= 1} active={step === 1}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-planetary text-white">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <Bar className="h-3 w-20" tone="strong" />
          </div>
          <div className="size-8 rounded-full bg-galaxy/10" />
        </div>
      </Region>

      <div className="flex flex-1 flex-col gap-4 px-5 pt-1">
        {/* large title */}
        <Region revealed={step >= 1} active={step === 1}>
          <div className="space-y-2">
            <Bar className="h-6 w-32" tone="strong" />
            <Bar className="h-2.5 w-44" tone="faint" />
          </div>
        </Region>

        {/* hero card */}
        <Region revealed={step >= 2} active={step === 2}>
          <div className="space-y-3 rounded-3xl bg-planetary/15 p-5">
            <Bar className="h-4 w-40" tone="strong" />
            <Bar className="h-2.5 w-full" tone="faint" />
            <Bar className="h-2.5 w-3/4" tone="faint" />
            <div className="flex gap-2 pt-1">
              <div className="h-9 w-28 rounded-full bg-planetary/80" />
              <div className="h-9 w-20 rounded-full bg-white/80" />
            </div>
          </div>
        </Region>

        {/* quick-action chip row */}
        <Region revealed={step >= 3} active={step === 3}>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border border-galaxy/10 bg-white p-3">
                <div className="size-9 rounded-full bg-sky/60" />
                <Bar className="h-2 w-12" tone="faint" />
              </div>
            ))}
          </div>
        </Region>

        {/* content list rows */}
        <Region revealed={step >= 4} active={step === 4}>
          <div className="overflow-hidden rounded-2xl border border-galaxy/10 bg-white">
            <div className="divide-y divide-galaxy/[0.06]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5">
                  <div className="size-10 rounded-xl bg-venus/50" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Bar className="h-3 w-32" tone="normal" />
                    <Bar className="h-2.5 w-44" tone="faint" />
                  </div>
                  <Bar className="h-3 w-12" tone="faint" />
                </div>
              ))}
            </div>
          </div>
        </Region>
      </div>

      {/* bottom tab bar */}
      <Region revealed={step >= 5} active={step >= 5}>
        <div className="mt-2 flex items-center justify-around border-t border-galaxy/10 bg-white px-2 pb-4 pt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={cn("size-5 rounded-md", i === 0 ? "bg-planetary" : "bg-galaxy/15")} />
              <Bar className="h-1.5 w-8" tone={i === 0 ? "strong" : "faint"} />
            </div>
          ))}
        </div>
      </Region>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin shell: sidebar + header + kind-specific main content          */
/* ------------------------------------------------------------------ */

function AdminShell({ kind, step }: { kind: LayoutKind; step: number }) {
  return (
    <div className="flex size-full">
      {/* Sidebar */}
      <Region revealed={step >= 1} active={step === 1}>
        <aside className="flex h-full w-[248px] shrink-0 flex-col gap-6 border-r border-galaxy/10 bg-white p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-planetary text-white">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <Bar className="h-3.5 w-24" tone="strong" />
          </div>
          <div className="space-y-2">
            <Bar className="h-2.5 w-16" tone="faint" />
            {Array.from({ length: 4 }).map((_, i) => (
              <NavItem key={i} active={i === 0} />
            ))}
          </div>
          <div className="mt-2 space-y-2">
            <Bar className="h-2.5 w-20" tone="faint" />
            {Array.from({ length: 3 }).map((_, i) => (
              <NavItem key={i} />
            ))}
          </div>
        </aside>
      </Region>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-8">
        <Region revealed={step >= 2} active={step === 2}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2.5">
              <Bar className="h-7 w-64" tone="strong" />
              <Bar className="h-3 w-80" tone="faint" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-32 rounded-xl border border-galaxy/10 bg-meteor" />
              <div className="h-10 w-36 rounded-xl bg-planetary/90" />
            </div>
          </div>
        </Region>

        {kind === "dashboard" ? <DashboardMain step={step} /> : null}
        {kind === "table" ? <TableMain step={step} /> : null}
        {kind === "form" ? <FormMain step={step} /> : null}
        {kind === "generic" ? <GenericMain step={step} /> : null}
      </div>
    </div>
  );
}

function DashboardMain({ step }: { step: number }) {
  return (
    <>
      <Region revealed={step >= 3} active={step === 3}>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} tint={i % 2 === 0 ? "sky" : "venus"} />
          ))}
        </div>
      </Region>
      <Region revealed={step >= 4} active={step === 4}>
        <div className="grid grid-cols-2 gap-5">
          <ChartCard variant="bars" />
          <ChartCard variant="donut" />
        </div>
      </Region>
      <Region revealed={step >= 5} active={step === 5}>
        <TableCard rows={4} />
      </Region>
    </>
  );
}

function TableMain({ step }: { step: number }) {
  return (
    <>
      <Region revealed={step >= 3} active={step === 3}>
        <div className="flex items-center gap-3 rounded-2xl border border-galaxy/10 bg-white p-3">
          <div className="h-9 w-64 rounded-lg bg-meteor" />
          <div className="h-9 w-28 rounded-lg bg-meteor" />
          <div className="ml-auto h-9 w-32 rounded-lg bg-planetary/90" />
        </div>
      </Region>
      <Region revealed={step >= 4} active={step === 4}>
        <TableCard rows={6} />
      </Region>
    </>
  );
}

function FormMain({ step }: { step: number }) {
  return (
    <Region revealed={step >= 3} active={step === 3}>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5 rounded-2xl border border-galaxy/10 bg-white p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bar className="h-2.5 w-28" tone="faint" />
              <div className="h-10 w-full rounded-xl border border-galaxy/10 bg-meteor" />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <div className="h-10 w-28 rounded-xl border border-galaxy/10 bg-meteor" />
            <div className="h-10 w-32 rounded-xl bg-planetary/90" />
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-galaxy/10 bg-sky/40 p-6">
          <Bar className="h-3.5 w-28" tone="strong" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-2.5 w-full" tone="faint" />
          ))}
        </div>
      </div>
    </Region>
  );
}

function GenericMain({ step }: { step: number }) {
  return (
    <Region revealed={step >= 3} active={step === 3}>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-galaxy/10 bg-sky/40" />
          ))}
        </div>
        <TableCard rows={3} />
      </div>
    </Region>
  );
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function Region({
  revealed,
  active,
  children,
}: {
  revealed: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        revealed ? "translate-y-0 opacity-100 blur-0" : "translate-y-3 opacity-0 blur-[2px]",
        active && "[&_[data-shimmer]]:animate-pulse",
      )}
    >
      {children}
    </div>
  );
}

function Bar({ className, tone = "normal" }: { className?: string; tone?: "faint" | "normal" | "strong" }) {
  return (
    <div
      data-shimmer
      className={cn(
        "rounded-full",
        tone === "faint" ? "bg-meteor" : tone === "strong" ? "bg-galaxy/15" : "bg-galaxy/10",
        className,
      )}
    />
  );
}

function NavItem({ active }: { active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5", active ? "bg-sky" : "bg-transparent")}>
      <div className={cn("size-4 rounded", active ? "bg-planetary" : "bg-galaxy/15")} />
      <Bar className="h-2.5 w-24" tone={active ? "strong" : "normal"} />
    </div>
  );
}

function StatCard({ tint }: { tint: "sky" | "venus" }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border border-galaxy/10 p-4", tint === "sky" ? "bg-sky/50" : "bg-venus/40")}>
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-white/70" />
        <Bar className="h-2.5 w-12" tone="faint" />
      </div>
      <Bar className="h-6 w-20" tone="strong" />
      <Bar className="h-2.5 w-16" tone="faint" />
    </div>
  );
}

function ChartCard({ variant }: { variant: "bars" | "donut" }) {
  return (
    <div className="space-y-4 rounded-2xl border border-galaxy/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <Bar className="h-3.5 w-40" tone="strong" />
        <div className="h-7 w-24 rounded-lg bg-meteor" />
      </div>
      {variant === "bars" ? (
        <div className="flex h-40 items-end gap-3 px-1">
          {[60, 38, 82, 50, 70, 44, 90].map((h, i) => (
            <div key={i} data-shimmer className="flex-1 rounded-t-md bg-planetary/30" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center">
          <div className="size-32 rounded-full border-[14px] border-planetary/30 border-r-universe/60 border-t-planetary/70" />
        </div>
      )}
    </div>
  );
}

function TableCard({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-galaxy/10 bg-white">
      <div className="flex items-center justify-between border-b border-galaxy/10 p-4">
        <Bar className="h-3.5 w-36" tone="strong" />
        <div className="h-8 w-28 rounded-lg bg-meteor" />
      </div>
      <div className="divide-y divide-galaxy/[0.06]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="size-9 rounded-full bg-meteor" />
            <Bar className="h-3 w-40" tone="normal" />
            <Bar className="ml-auto h-3 w-24" tone="faint" />
            <Bar className="h-3 w-16" tone="faint" />
            <div className="h-6 w-20 rounded-full bg-sky/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
