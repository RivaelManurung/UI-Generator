"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Eyebrow, Pill, SectionHeading } from "./avekto-kit";
import { cn } from "@/lib/utils";

const templates = [
  {
    name: "Civil Rights Intake Form",
    tag: "Intake",
    tone: "blue" as const,
    fields: ["Complainant", "Incident type", "Date", "Evidence"],
  },
  {
    name: "HR Investigation Case",
    tag: "Workflow",
    tone: "amber" as const,
    fields: ["Subject", "Allegation", "Interviews", "Findings"],
  },
  {
    name: "Legal Matter Management",
    tag: "Matter",
    tone: "green" as const,
    fields: ["Matter type", "Parties", "Deadlines", "Documents"],
  },
];

const faqs = [
  {
    q: "How is Avekto different from a project management tool?",
    a: "Project tools track tasks. Avekto tracks cases — structured records with required fields, routing, permissions, and a complete, audit-ready history of every action taken.",
  },
  {
    q: "How is sensitive case data protected?",
    a: "Field-level role permissions, strict isolation between matters, encryption in transit and at rest, and an immutable audit log. Infrastructure is SOC 2-ready and CJIS-aligned.",
  },
  {
    q: "Does Avekto include contact management?",
    a: "Yes. People and organizations are first-class records linked across cases, so you always see the full relationship history without duplicating data.",
  },
  {
    q: "What does it cost?",
    a: "Pricing scales with seats and case volume. Start with a free trial, then talk to our team for a plan matched to your team's size and compliance needs.",
  },
];

export function AvektoTemplates() {
  return (
    <section className="landing-section-blue border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>Templates</Eyebrow>
          <SectionHeading className="mt-3">Start from a proven structure</SectionHeading>
          <p className="mt-4 max-w-xl leading-7 text-landing-text-soft">
            Launch with a battle-tested case template, then adapt every field and
            rule to how your team actually works.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3" stagger={0.06}>
          {templates.map((t) => (
            <RevealItem key={t.name} className="h-full">
              <article className="group flex h-full flex-col rounded-2xl border border-landing-border bg-white p-5 shadow-[0_14px_40px_rgb(20_22_28_/_6%)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgb(20_22_28_/_9%)]">
                <div className="flex items-center justify-between">
                  <Pill tone={t.tone}>{t.tag}</Pill>
                  <ChevronRight className="size-4 text-landing-text-faint transition-transform group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-[15px] font-bold tracking-normal text-galaxy">
                  {t.name}
                </h3>
                <div className="mt-4 space-y-2">
                  {t.fields.map((f) => (
                    <div
                      key={f}
                      className="flex items-center justify-between rounded-md border border-landing-border bg-meteor/30 px-2.5 py-1.5"
                    >
                      <span className="text-[10px] font-medium text-galaxy">{f}</span>
                      <span className="h-1.5 w-10 rounded-full bg-galaxy/10" />
                    </div>
                  ))}
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function AvektoFaq() {
  return (
    <section className="border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <Eyebrow>Common questions</Eyebrow>
          <SectionHeading className="mt-3">Frequently asked questions</SectionHeading>
          <p className="mt-4 text-[13px] leading-6 text-landing-text-soft">
            Can&apos;t find what you&apos;re looking for?{" "}
            <Link href="#contact" className="font-semibold text-planetary hover:underline">
              Contact support
            </Link>
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <FaqList />
        </Reveal>
      </div>
    </section>
  );
}

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-landing-border border-y border-landing-border">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className="text-[14px] font-semibold text-galaxy">{f.q}</span>
              <Plus
                className={cn(
                  "size-4 shrink-0 text-planetary transition-transform duration-300",
                  isOpen && "rotate-45",
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300",
                isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="text-[13px] leading-6 text-landing-text-soft">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
