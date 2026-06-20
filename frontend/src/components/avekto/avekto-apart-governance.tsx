"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { BrowserFrame, Eyebrow, Lines, Pill, SectionHeading } from "./avekto-kit";
import { cn } from "@/lib/utils";

const apart = [
  {
    title: "Your compliance lead builds it. No developer. No delay.",
    copy: "Intake forms, routing rules, SLAs — configure your own case workflow in an afternoon, not a quarter.",
    cta: "See how teams configure cases",
    mock: "config" as const,
  },
  {
    title: "Document every case data point exactly once.",
    copy: "A single structured record powers reports, exports, and the audit trail — defined by the people who own the process.",
    cta: "Explore the form builder",
    mock: "builder" as const,
  },
  {
    title: "Investigators investigate. AI handles the paperwork.",
    copy: "Summaries, timelines, and first-draft reports are generated automatically while your team focuses on the case.",
    cta: "See AI assistance",
    mock: "ai" as const,
  },
];

const governance = [
  { title: "Cases route themselves", copy: "Rules assign owners by type and jurisdiction." },
  { title: "Granular permissions", copy: "Role-based access down to each field." },
  { title: "Parties never see each other's data", copy: "Strict isolation between matters." },
  { title: "Patterns surface before you look", copy: "Trends flagged across the full caseload." },
];

export function AvektoApart() {
  return (
    <section className="landing-section-soft border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>What sets Avekto apart</Eyebrow>
          <SectionHeading className="mt-3">
            Built for the teams that can&apos;t afford to get it wrong.
          </SectionHeading>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-5 lg:grid-cols-3" stagger={0.06}>
          {apart.map((a) => (
            <RevealItem key={a.title} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-landing-border bg-white p-5 shadow-[0_14px_40px_rgb(20_22_28_/_6%)]">
                <ApartMock kind={a.mock} />
                <h3 className="mt-5 text-[16px] font-bold leading-snug tracking-normal text-galaxy">
                  {a.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-landing-text-soft">
                  {a.copy}
                </p>
                <Link
                  href="#contact"
                  className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-planetary"
                >
                  {a.cta}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function ApartMock({ kind }: { kind: "config" | "builder" | "ai" }) {
  return (
    <div className="rounded-xl border border-landing-border bg-meteor/40 p-3">
      {kind === "config" ? (
        <div className="space-y-2">
          {["Routing rule", "SLA: 48h", "Auto-assign"].map((l, i) => (
            <div
              key={l}
              className="flex items-center justify-between rounded-md border border-landing-border bg-white px-2.5 py-2"
            >
              <span className="text-[10px] font-medium text-galaxy">{l}</span>
              <span
                className={cn(
                  "flex h-4 w-7 items-center rounded-full p-0.5",
                  i === 2 ? "justify-start bg-galaxy/15" : "justify-end bg-planetary",
                )}
              >
                <span className="size-3 rounded-full bg-white" />
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {kind === "builder" ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1.5">
            {["Short text", "Dropdown", "Date", "File upload"].map((l) => (
              <div
                key={l}
                className="rounded-md border border-landing-border bg-white px-2 py-1.5 text-[9px] font-medium text-landing-text-soft"
              >
                {l}
              </div>
            ))}
          </div>
          <div className="w-16 rounded-md border border-dashed border-planetary/40 bg-planetary/5 p-1.5">
            <Lines rows={4} />
          </div>
        </div>
      ) : null}

      {kind === "ai" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="grid size-4 place-items-center rounded bg-planetary text-[8px] font-bold text-white">
              AI
            </span>
            <span className="text-[9px] font-semibold text-galaxy">Draft report</span>
            <Pill tone="green">Ready</Pill>
          </div>
          <div className="rounded-md border border-landing-border bg-white p-2">
            <Lines rows={4} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AvektoGovernance() {
  return (
    <section className="border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Eyebrow>Governance</Eyebrow>
            <SectionHeading className="mt-3">
              What your security team reviews before you sign
            </SectionHeading>
            <p className="mt-4 max-w-md leading-7 text-landing-text-soft">
              SOC 2-ready, field-level permissions, immutable audit log, and CJIS-aligned
              infrastructure. The questionnaire answers are already &quot;yes.&quot;
            </p>
            <Link
              href="#contact"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-planetary"
            >
              Explore solutions by industry
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <BrowserFrame label="Audit log">
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-2.5 w-24 rounded-full bg-galaxy/15" />
                  <Pill tone="green">Immutable</Pill>
                </div>
                <div className="overflow-hidden rounded-md border border-landing-border">
                  {["Viewed record", "Edited field", "Exported PDF", "Role changed", "Login"].map(
                    (l, i) => (
                      <div
                        key={l}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2",
                          i % 2 ? "bg-meteor/30" : "bg-white",
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-planetary" />
                        <span className="text-[10px] font-medium text-galaxy">{l}</span>
                        <span className="ml-auto text-[8px] tabular-nums text-landing-text-faint">
                          2024-03-0{i + 1}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </BrowserFrame>
          </Reveal>
        </div>

        <RevealGroup
          className="mt-14 grid gap-x-8 gap-y-6 border-t border-landing-border pt-10 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.05}
        >
          {governance.map((g) => (
            <RevealItem key={g.title}>
              <div className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-planetary" aria-hidden="true" />
                <div>
                  <h3 className="text-[13px] font-bold tracking-normal text-galaxy">
                    {g.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-landing-text-soft">
                    {g.copy}
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
