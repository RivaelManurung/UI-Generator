"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { MotionConfig, motion } from "framer-motion";

import { SiteHeader } from "@/components/layout/site-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { FreeTemplateCard } from "@/components/freebies/free-template-card";
import { FreeTemplatePreviewDialog } from "@/components/freebies/free-template-preview-dialog";
import { useDesignSystems } from "@/hooks/use-design-systems";
import { freeTemplateService } from "@/lib/services/free-template-service";
import type { FreeTemplate } from "@/types/free-template";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

// Hero entrance plays on load (above the fold) — initial/animate rather than
// the scroll-triggered Reveal primitives the sections below use.
const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const stats = [
  { value: "40+", label: "Dashboard patterns" },
  { value: "3 min", label: "To first draft" },
  { value: "100%", label: "Responsive baseline" },
] as const;

const capabilities = [
  "Admin dashboards",
  "SaaS pages",
  "Billing screens",
  "CRM workspaces",
  "Internal tools",
] as const;

const workflow = [
  { step: "01", title: "Describe the product", copy: "Brief the purpose, audience, core data, and the states you need." },
  { step: "02", title: "Generate variants", copy: "Get multiple layout directions without losing product structure." },
  { step: "03", title: "Inspect the blueprint", copy: "Review sections, tables, cards, filters, and responsive behavior." },
  { step: "04", title: "Export and refine", copy: "Move the chosen draft into your codebase and keep polishing." },
] as const;

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="landing-shell min-h-screen selection:bg-planetary selection:text-white">
        <SiteHeader />
        <HeroSection />
        <CapabilityStrip />
        <ExamplesSection />
        <WorkflowSection />
        <PricingSection />
        <FinalCta />
        <SiteFooter />
      </main>
    </MotionConfig>
  );
}

function HeroSection() {
  return (
    <section id="generator" className="landing-hero relative scroll-mt-24">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={heroContainer}
        className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20"
      >
        <div className="text-center lg:text-left">
          <motion.span
            variants={heroItem}
            className="landing-pill inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium tracking-normal"
          >
            One brief → dashboards, admin panels, and landing pages
          </motion.span>

          <motion.h1
            variants={heroItem}
            className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-normal sm:text-5xl lg:text-6xl"
          >
            Build project UI like a senior product team.
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="landing-text-soft mx-auto mt-6 max-w-xl text-base leading-7 sm:text-lg lg:mx-0"
          >
            Generate structured interfaces for SaaS dashboards, admin panels, and
            internal tools — clear sections, responsive states, and export-ready layouts.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/app/studio/demo"
              prefetch={false}
              className="landing-primary-button group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Start generating
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="#projects"
              className="landing-secondary-button inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              See examples
            </Link>
          </motion.div>

          <motion.dl variants={heroItem} className="mt-10 grid max-w-md grid-cols-3 gap-6 lg:max-w-none">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold tabular-nums sm:text-3xl">{stat.value}</dd>
                <p className="landing-text-muted mt-1 text-xs leading-5 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div variants={heroItem} className="relative">
          <HeroStudioPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroStudioPreview() {
  const bars = [44, 72, 60, 90, 76, 110, 92, 132, 104, 148, 120, 162];
  return (
    <div className="landing-studio-shell rounded-3xl p-3">
      <div className="landing-studio-window overflow-hidden rounded-2xl">
        <div className="landing-studio-topbar flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-galaxy/15" />
            <span className="size-2.5 rounded-full bg-galaxy/15" />
            <span className="size-2.5 rounded-full bg-galaxy/15" />
          </div>
          <p className="landing-text-muted text-xs font-semibold">DashboardCraft Studio</p>
          <div className="w-16" />
        </div>

        <div className="grid lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden border-r border-landing-border p-4 text-left lg:block">
            <p className="landing-text-muted text-xs font-semibold uppercase tracking-normal">Project pages</p>
            <div className="mt-4 grid gap-1.5">
              {["Overview", "Billing", "Customers", "Settings", "Empty states"].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold",
                    index === 0
                      ? "bg-planetary/10 text-planetary"
                      : "border border-landing-border text-landing-text-soft",
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="p-4 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-normal">Subscription dashboard</p>
                <p className="landing-text-muted mt-1 text-sm">Generated preview · Variant 03</p>
              </div>
              <span className="landing-pill-muted rounded-full px-3 py-1 text-xs font-semibold">Export ready</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="MRR" value="$42.8k" meta="+18.2%" accent />
              <MetricCard label="Customers" value="2,481" meta="+214" />
              <MetricCard label="Usage" value="78%" meta="Healthy" />
            </div>

            <div className="landing-card-solid mt-4 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Revenue movement</p>
                <p className="landing-text-muted text-xs">Generated chart</p>
              </div>
              <div className="mt-6 flex h-32 items-end gap-1.5" aria-hidden="true">
                {bars.map((height, index) => (
                  <motion.span
                    key={`${height}-${index}`}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease, delay: index * 0.04 }}
                    className={cn("flex-1 origin-bottom rounded-t-md", index > 7 ? "bg-planetary" : "bg-planetary/25")}
                    style={{ height: `${(height / 162) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, meta, accent = false }: { label: string; value: string; meta: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-planetary bg-planetary text-white" : "border-landing-border bg-white")}>
      <p className={cn("text-xs font-semibold", accent ? "text-white/90" : "landing-text-muted")}>{label}</p>
      <p className="mt-3 text-xl font-bold tabular-nums tracking-normal">{value}</p>
      <p className={cn("mt-1 text-xs", accent ? "text-white/80" : "landing-text-muted")}>{meta}</p>
    </div>
  );
}

function CapabilityStrip() {
  return (
    <section className="border-y border-landing-border px-4 py-6 sm:px-6">
      <Reveal className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2.5">
        <span className="landing-text-muted mr-1 text-xs font-semibold uppercase tracking-widest">Built for</span>
        {capabilities.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full border border-landing-border px-3 py-1.5 text-xs font-semibold text-landing-text-soft"
          >
            <Check className="size-3.5 text-planetary" aria-hidden="true" />
            {item}
          </span>
        ))}
      </Reveal>
    </section>
  );
}

// ExamplesSection shows REAL published free templates (live previews), not
// mock skeletons — so "examples" actually reflects generated output. Falls back
// to an honest empty state when none are published yet.
function ExamplesSection() {
  const [items, setItems] = useState<FreeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const designSystems = useDesignSystems();

  useEffect(() => {
    let cancelled = false;
    freeTemplateService
      .listPublic()
      .then((list) => {
        if (!cancelled) setItems(list.slice(0, 6));
      })
      .catch(() => {
        /* empty state handles failure */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="projects" className="scroll-mt-24 border-b border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            align="left"
            eyebrow="Examples"
            title="Real templates, generated and ready to copy."
            copy="Live previews of dashboards built with DashboardCraft — open one to copy its HTML or TSX."
          />
          <Link
            href="/templates"
            className="landing-secondary-button inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Browse all templates
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-planetary" aria-label="Loading examples" />
          </div>
        ) : items.length === 0 ? (
          <div className="landing-card mt-12 rounded-2xl border-dashed px-6 py-16 text-center">
            <p className="text-base font-semibold">Your generated templates will show here</p>
            <p className="landing-text-muted mx-auto mt-1 max-w-md text-sm leading-6">
              Generate a project in the studio, then publish it as a free template to feature it on this page.
            </p>
            <Link
              href="/app/studio/demo"
              prefetch={false}
              className="landing-primary-button mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
            >
              Open the studio
            </Link>
          </div>
        ) : (
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {items.map((template) => (
              <RevealItem key={template.slug} className="h-full">
                <FreeTemplateCard template={template} designSystems={designSystems} onOpen={setOpenSlug} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>

      <FreeTemplatePreviewDialog
        slug={openSlug}
        open={openSlug !== null}
        onOpenChange={(o) => {
          if (!o) setOpenSlug(null);
        }}
        designSystems={designSystems}
      />
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Workflow"
          title="From rough idea to usable project draft."
          copy="A clean four-step flow keeps the result practical — describe, generate, inspect, export."
        />
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((item) => (
            <RevealItem key={item.step}>
              <article className="landing-card landing-card-hover h-full rounded-2xl p-5 transition hover:-translate-y-1">
                <div className="grid size-11 place-items-center rounded-xl bg-planetary font-mono text-sm font-semibold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-normal">{item.title}</h3>
                <p className="landing-text-soft mt-2 text-sm leading-6">{item.copy}</p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 border-y border-landing-border px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Pricing"
          title="One-time credits. No subscription."
          copy="Pay only for successful, validated output — your credits never expire."
        />
        <div className="mt-12">
          <PricingPlans redirectTo="/" />
        </div>
        <p className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-planetary hover:underline">
            See full pricing &amp; FAQ →
          </Link>
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 pt-20 sm:px-6">
      <Reveal className="landing-cta mx-auto max-w-7xl rounded-3xl p-8 text-center text-white sm:p-14">
        <p className="text-xs font-semibold uppercase tracking-normal text-white/90">Generate your next project</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-bold tracking-normal sm:text-4xl">
          Stop designing every project from zero.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/90">
          Create a clean UI direction, preview real templates, and ship dashboard interfaces faster.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/app/studio/demo"
            prefetch={false}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-meteor px-6 text-sm font-semibold text-galaxy transition hover:-translate-y-0.5 hover:brightness-95"
          >
            Open generator
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link
            href="#projects"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            View examples
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// Minimal footer: brand + real links only (no fake nav groups).
const footerLinks = [
  { href: "#projects", label: "Examples" },
  { href: "#workflow", label: "Workflow" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Log in" },
] as const;

function SiteFooter() {
  return (
    <footer className="border-t border-landing-border px-4 py-10 sm:px-6">
      <Reveal className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" className="group flex items-center gap-3">
          <span className="landing-brand-mark grid size-9 place-items-center rounded-xl text-sm font-semibold transition-transform group-hover:-translate-y-0.5">
            D
          </span>
          <span className="text-sm font-semibold tracking-normal">DashboardCraft</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="landing-text-soft relative transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-galaxy after:transition-transform after:duration-300 hover:text-galaxy hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-8 max-w-7xl">
        <p className="landing-text-muted text-center text-xs sm:text-left">
          © 2026 DashboardCraft. Project UI generator.
        </p>
      </Reveal>
    </footer>
  );
}

function SectionHeader({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="landing-text-muted text-xs font-semibold uppercase tracking-normal">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-3xl font-bold tracking-normal sm:text-4xl">{title}</h2>
      <p className="landing-text-soft mt-4 leading-7">{copy}</p>
    </Reveal>
  );
}
