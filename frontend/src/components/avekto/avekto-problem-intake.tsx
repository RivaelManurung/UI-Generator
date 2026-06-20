"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, FolderX, Inbox } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { BrowserFrame, Eyebrow, Lines, Pill, SectionHeading } from "./avekto-kit";

const problems = [
  {
    icon: Inbox,
    title: "Cases in shared inboxes for days before anyone owns them",
    copy: "No clear owner means easy cases stall and urgent ones get missed entirely.",
  },
  {
    icon: FolderX,
    title: "The case file lives across email, Slack, and three folders",
    copy: "Context is scattered, so every handoff starts with someone rebuilding the story.",
  },
  {
    icon: AlertTriangle,
    title: "Audit requests become week-long reconstruction projects",
    copy: "When proof is requested, the team scrambles to piece together what actually happened.",
  },
];

export function AvektoProblem() {
  return (
    <section className="border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>The problem</Eyebrow>
          <SectionHeading className="mt-3">
            What we hear from teams without a case system
          </SectionHeading>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3" stagger={0.06}>
          {problems.map((p) => (
            <RevealItem key={p.title} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-landing-border bg-meteor/30 p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-white text-planetary shadow-[0_4px_12px_rgb(20_22_28_/_5%)]">
                  <p.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold leading-snug tracking-normal text-galaxy">
                  {p.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-landing-text-soft">
                  {p.copy}
                </p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function AvektoIntake() {
  return (
    <section className="border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow>Intake &amp; investigations</Eyebrow>
          <SectionHeading className="mt-3">
            Open the case. Everything is already there.
          </SectionHeading>
          <p className="mt-4 max-w-md leading-7 text-landing-text-soft">
            Mandatory fields, validated inputs, and AI-populated data. No chasing
            intake forms, no missing folders, no assembling a file — work starts
            right away.
          </p>
          <Link
            href="#contact"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-planetary"
          >
            See case management
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <BrowserFrame label="Case · Rodriguez v. District M">
            <div className="grid grid-cols-[1.4fr_1fr] gap-px bg-landing-border">
              <div className="space-y-3 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-galaxy">
                      Rodriguez v. District M
                    </div>
                    <div className="text-[10px] text-landing-text-muted">
                      Case #CV-2024-0481
                    </div>
                  </div>
                  <Pill tone="amber">In review</Pill>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Type", "Civil rights"],
                    ["Owner", "M. Chen"],
                    ["Opened", "Mar 4"],
                    ["Due", "Apr 18"],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="rounded-md border border-landing-border bg-meteor/40 px-2 py-1.5"
                    >
                      <div className="text-[8px] font-medium text-landing-text-muted">
                        {l}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-galaxy">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-landing-border p-2.5">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-landing-text-muted">
                    Summary
                  </div>
                  <Lines rows={3} />
                </div>
              </div>
              <div className="space-y-2 bg-meteor/30 p-4">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-landing-text-muted">
                  Activity
                </div>
                {["Filed intake", "AI populated", "Owner assigned", "Note added"].map(
                  (l, i) => (
                    <div key={l} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-planetary" />
                      <div>
                        <div className="text-[10px] font-medium text-galaxy">{l}</div>
                        <div className="text-[8px] text-landing-text-faint">
                          0{i + 1}:1{i} PM
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </BrowserFrame>
        </Reveal>
      </div>
    </section>
  );
}
