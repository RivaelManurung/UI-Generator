"use client";

import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Eyebrow, Lines, Pill, SectionHeading } from "./avekto-kit";

const cards = [
  {
    title: "No more incomplete cases",
    copy: "Intake forms collect every required field, attachment, and consent before a case can move forward.",
  },
  {
    title: "The right person has it in minutes",
    copy: "Cases route by type, jurisdiction, and workload. The owner is assigned the moment intake completes.",
  },
  {
    title: "Leadership sees where every case stands",
    copy: "One live view of caseload, status, and aging — so nothing quietly stalls between handoffs.",
  },
  {
    title: "When the auditor asks, you have the answer",
    copy: "Every action is captured automatically, so reconstructing the full history takes seconds, not weeks.",
  },
];

export function AvektoLifecycle() {
  return (
    <section className="landing-section-blue border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>Case lifecycle</Eyebrow>
          <SectionHeading className="mt-3">
            Your team stops losing cases between handoffs
          </SectionHeading>
          <p className="mt-4 max-w-xl leading-7 text-landing-text-soft">
            Every case has an owner, a defined stage, and a complete history —
            without anyone chasing updates.
          </p>
        </Reveal>

        <RevealGroup
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.06}
        >
          {cards.map((card, i) => (
            <RevealItem key={card.title} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-landing-border bg-white p-5 shadow-[0_14px_40px_rgb(20_22_28_/_6%)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgb(20_22_28_/_9%)]">
                <LifecycleMock index={i} />
                <h3 className="mt-5 text-[15px] font-bold tracking-normal text-galaxy">
                  {card.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-landing-text-soft">
                  {card.copy}
                </p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function LifecycleMock({ index }: { index: number }) {
  return (
    <div className="rounded-xl border border-landing-border bg-meteor/40 p-3">
      {index === 0 ? (
        <div className="space-y-2">
          {["Reporter", "Incident date", "Attachment"].map((l) => (
            <div key={l} className="rounded-md border border-landing-border bg-white px-2 py-1.5">
              <div className="text-[8px] font-medium text-landing-text-muted">{l}</div>
              <div className="mt-1 h-1.5 w-2/3 rounded-full bg-galaxy/10" />
            </div>
          ))}
        </div>
      ) : null}

      {index === 1 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-landing-border bg-white px-2 py-1.5">
            <span className="size-5 rounded-full bg-planetary/15" />
            <Lines rows={2} />
            <Pill tone="blue">Assigned</Pill>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-landing-border bg-white px-2 py-1.5 opacity-70">
            <span className="size-5 rounded-full bg-galaxy/10" />
            <Lines rows={2} />
          </div>
        </div>
      ) : null}

      {index === 2 ? (
        <div className="space-y-2">
          {[
            ["Open", "blue"],
            ["In review", "amber"],
            ["Closed", "green"],
          ].map(([l, tone], i) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-[9px] text-landing-text-soft">{l}</span>
              <div className="h-1.5 flex-1 mx-2 overflow-hidden rounded-full bg-galaxy/8">
                <div
                  className="h-full rounded-full bg-planetary"
                  style={{ width: `${[70, 45, 90][i]}%` }}
                />
              </div>
              <Pill tone={tone as "blue" | "amber" | "green"}>{[12, 8, 21][i]}</Pill>
            </div>
          ))}
        </div>
      ) : null}

      {index === 3 ? (
        <div className="space-y-1.5">
          {["Case created", "Owner assigned", "Note added", "Status changed"].map(
            (l, i) => (
              <div key={l} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-planetary" />
                <span className="text-[9px] text-landing-text-soft">{l}</span>
                <span className="ml-auto text-[8px] text-landing-text-faint">
                  0{i + 1}:2{i}
                </span>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
