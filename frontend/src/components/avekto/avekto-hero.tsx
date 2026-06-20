"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { BrowserFrame, Lines, Pill } from "./avekto-kit";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const trusted = ["Automotive", "Real Estate", "Operations", "Legal"];

export function AvektoHero() {
  return (
    <section className="relative overflow-hidden border-b border-landing-border">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "var(--landing-hero-bg)" }}
        aria-hidden="true"
      />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="relative mx-auto max-w-5xl px-4 pt-16 text-center sm:px-6 lg:pt-20"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-1.5 rounded-full border border-landing-border bg-white/80 px-3 py-1.5 text-xs font-medium text-landing-text-soft shadow-[0_4px_14px_rgb(20_22_28_/_5%)]"
        >
          <Sparkles className="size-3.5 text-planetary" aria-hidden="true" />
          Built for teams whose cases carry consequences
        </motion.span>

        <motion.h1
          variants={item}
          className="mx-auto mt-6 max-w-3xl text-balance text-[40px] font-bold leading-[1.06] tracking-normal text-galaxy sm:text-[56px]"
        >
          Your team closes cases faster.
          <br className="hidden sm:block" /> Auditors find nothing missing.
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-5 max-w-xl text-base leading-7 text-landing-text-soft"
        >
          Less time chasing records, more time investigating — every action
          already documented for the audit.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-planetary px-5 text-sm font-semibold text-white shadow-brand-sm transition hover:-translate-y-0.5 hover:brightness-95"
          >
            Start free trial
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="#contact"
            className="inline-flex h-11 items-center justify-center rounded-md border border-landing-border-strong bg-white px-5 text-sm font-semibold text-galaxy transition hover:-translate-y-0.5 hover:bg-meteor/50"
          >
            Book a demo
          </Link>
        </motion.div>
      </motion.div>

      <HeroScreens />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <p className="text-center text-[13px] text-landing-text-muted">
          Trusted by leading teams from{" "}
          {trusted.map((t, i) => (
            <span key={t}>
              <span className="font-semibold text-galaxy">{t}</span>
              {i < trusted.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

// A fanned arrangement of four dashboard screenshots that bleed off the bottom,
// mirroring the reference hero. On small screens it falls back to a clean scroll.
function HeroScreens() {
  return (
    <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6">
      <div className="relative mx-auto flex max-w-5xl items-end justify-center">
        <HeroScreen className="hidden translate-y-6 -rotate-[7deg] lg:block" variant="list" z={10} scale={0.92} />
        <HeroScreen className="z-20 -mx-4 sm:-mx-6" variant="board" z={20} scale={1} />
        <HeroScreen className="hidden translate-y-2 -rotate-[2deg] sm:block" variant="metrics" z={15} scale={0.96} />
        <HeroScreen className="hidden translate-y-8 rotate-[7deg] lg:block" variant="chart" z={10} scale={0.92} />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

function HeroScreen({
  className,
  variant,
  z,
  scale,
}: {
  className?: string;
  variant: "list" | "board" | "metrics" | "chart";
  z: number;
  scale: number;
}) {
  return (
    <div
      className={cn("w-[clamp(280px,40vw,420px)] origin-bottom", className)}
      style={{ zIndex: z, transform: `scale(${scale})` }}
    >
      <BrowserFrame label="app.avekto.com">
        <div className="h-[260px] overflow-hidden p-3">
          {variant === "list" ? <ListMock /> : null}
          {variant === "board" ? <BoardMock /> : null}
          {variant === "metrics" ? <MetricsMock /> : null}
          {variant === "chart" ? <ChartMock /> : null}
        </div>
      </BrowserFrame>
    </div>
  );
}

function ListMock() {
  return (
    <div className="space-y-2">
      <div className="mb-3 h-2.5 w-24 rounded-full bg-galaxy/15" />
      {["Open", "In review", "Escalated", "Closed", "Open"].map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-landing-border bg-white px-2.5 py-2"
        >
          <div className="space-y-1.5">
            <div className="h-1.5 w-20 rounded-full bg-galaxy/12" />
            <div className="h-1.5 w-12 rounded-full bg-galaxy/8" />
          </div>
          <Pill tone={i % 3 === 0 ? "blue" : i % 3 === 1 ? "amber" : "green"}>{s}</Pill>
        </div>
      ))}
    </div>
  );
}

function BoardMock() {
  const cols = [
    { t: "Intake", n: 3, tone: "blue" as const },
    { t: "Active", n: 2, tone: "amber" as const },
    { t: "Closed", n: 4, tone: "green" as const },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-2.5 w-28 rounded-full bg-galaxy/15" />
        <div className="h-5 w-14 rounded-md bg-planetary/12" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((c) => (
          <div key={c.t} className="rounded-lg bg-meteor/50 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-semibold text-galaxy">{c.t}</span>
              <Pill tone={c.tone}>{c.n}</Pill>
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: c.n > 2 ? 3 : 2 }).map((_, i) => (
                <div key={i} className="rounded-md border border-landing-border bg-white p-1.5">
                  <Lines rows={2} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsMock() {
  return (
    <div className="space-y-2.5">
      <div className="h-2.5 w-20 rounded-full bg-galaxy/15" />
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Open cases", "128"],
          ["Avg. close", "4.2d"],
          ["SLA met", "97%"],
          ["Overdue", "3"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-landing-border bg-white p-2">
            <div className="text-[8px] font-medium text-landing-text-muted">{l}</div>
            <div className="mt-1 text-sm font-bold tabular-nums text-galaxy">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-landing-border bg-white p-2">
        <div className="flex h-16 items-end gap-1">
          {[40, 70, 55, 85, 60, 95, 75].map((h, i) => (
            <div
              key={i}
              className={cn("flex-1 rounded-t", i > 4 ? "bg-planetary" : "bg-planetary/25")}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartMock() {
  return (
    <div className="space-y-3">
      <div className="h-2.5 w-24 rounded-full bg-galaxy/15" />
      <div className="grid place-items-center py-2">
        <div
          className="size-28 rounded-full"
          style={{
            background:
              "conic-gradient(var(--planetary) 0 45%, var(--universe) 45% 70%, var(--venus) 70% 88%, var(--sky) 88% 100%)",
          }}
        />
      </div>
      <div className="space-y-1.5">
        {["Legal", "Ops", "HR", "Other"].map((l, i) => (
          <div key={l} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{
                background: ["var(--planetary)", "var(--universe)", "var(--venus)", "var(--sky)"][i],
              }}
            />
            <span className="text-[9px] text-landing-text-soft">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
