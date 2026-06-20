"use client";

import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const benefits = [
  "Guided onboarding for your team",
  "Dedicated account manager",
  "Custom templates and routing rules",
  "Priority support and SLAs",
];

export function AvektoCta() {
  return (
    <section id="contact" className="scroll-mt-20 border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-planetary">
            Enterprise
          </p>
          <h2 className="mt-3 text-balance text-[28px] font-bold leading-[1.12] tracking-normal text-galaxy sm:text-[34px]">
            Ready to run cases the right way?
          </h2>
          <p className="mt-4 max-w-md leading-7 text-landing-text-soft">
            Talk to our team about Professional and Enterprise plans — custom
            onboarding, SSO, on-premises deployment, and dedicated support.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[14px] text-galaxy">
                <span className="grid size-5 place-items-center rounded-full bg-planetary/10 text-planetary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[13px] text-landing-text-muted">
            Looking for general support?{" "}
            <Link href="#" className="font-semibold text-planetary hover:underline">
              Email us
            </Link>
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-landing-border bg-white p-6 shadow-[0_24px_70px_rgb(20_22_28_/_10%)] sm:p-7">
            <h3 className="text-[18px] font-bold tracking-normal text-galaxy">Talk to our team</h3>
            <p className="mt-1 text-[13px] text-landing-text-muted">
              Fill out the form and we&apos;ll be in touch within 24 hours.
            </p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ContactForm() {
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Talk to our team"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="First name" placeholder="Jordan" />
        <Field id="lastName" label="Last name" placeholder="Reyes" />
      </div>
      <Field id="org" label="Organization" placeholder="Acme County" />
      <Field
        id="email"
        label="Work email"
        type="email"
        placeholder="jordan@acme.gov"
      />
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-planetary px-5 text-sm font-semibold text-white shadow-brand-sm transition hover:brightness-95"
      >
        Request a demo
      </button>
      <p className="text-center text-[11px] leading-5 text-landing-text-muted">
        By submitting, you agree to our{" "}
        <Link href="#" className="font-medium text-planetary hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="font-medium text-planetary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-galaxy">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-landing-border bg-white px-3 text-sm text-galaxy outline-none transition placeholder:text-landing-text-faint focus:border-planetary focus:ring-2 focus:ring-planetary/20"
      />
    </div>
  );
}

const footerCols = [
  {
    title: "Product",
    links: ["All features", "Pricing", "Integrations", "Templates"],
  },
  {
    title: "Features",
    links: ["Case Management", "Intake", "AI Assist", "Audit & Security"],
  },
  {
    title: "Compare",
    links: ["vs Monday.com", "vs Asana", "vs Spreadsheets", "vs Email"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Blog", "Privacy"],
  },
];

export function AvektoFooter() {
  return (
    <footer className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="#" className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-planetary text-white">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-bold tracking-normal text-galaxy">Avekto</span>
            </Link>
            <p className="mt-3 max-w-[220px] text-[13px] leading-6 text-landing-text-muted">
              The case management platform built for regulated industries.
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-galaxy">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link
                      href="#"
                      className="text-[13px] text-landing-text-soft transition hover:text-galaxy"
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-landing-border pt-6 sm:flex-row">
          <p className="text-[12px] text-landing-text-muted">
            © 2026 Avekto. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            <span className="text-[12px] font-medium text-landing-text-soft">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
