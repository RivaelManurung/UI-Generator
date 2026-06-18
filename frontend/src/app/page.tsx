"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MotionConfig, motion } from "framer-motion";

import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const viewport = {
  once: true,
  margin: "-80px",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const stats = [
  { value: "40+", label: "Dashboard patterns" },
  { value: "3 min", label: "To first draft" },
  { value: "100%", label: "Responsive baseline" },
] as const;

const projects = [
  {
    title: "FinTrack Admin",
    category: "Finance dashboard",
    description: "Revenue cards, invoice table, cashflow chart, and approval queue.",
  },
  {
    title: "SchoolOps Panel",
    category: "Education admin",
    description: "Attendance overview, student records, schedules, and report export.",
  },
  {
    title: "RetailPOS Insight",
    category: "POS analytics",
    description: "Outlet sales, stock movement, cashier shift, and transaction history.",
  },
  {
    title: "CRM Command",
    category: "Sales workspace",
    description: "Pipeline board, account detail, reminders, and activity timeline.",
  },
  {
    title: "SaaS Billing OS",
    category: "Subscription UI",
    description: "Plan cards, invoice list, usage meter, payment status, and settings.",
  },
  {
    title: "Ops Monitor",
    category: "Internal tool",
    description: "Queue status, SLA cards, incident list, and team performance.",
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Describe the product",
    copy: "Write the dashboard purpose, audience, core data, and required states.",
  },
  {
    step: "02",
    title: "Generate project variants",
    copy: "Get multiple layout directions without losing the product structure.",
  },
  {
    step: "03",
    title: "Inspect the blueprint",
    copy: "Review sections, tables, cards, filters, states, and responsive behavior.",
  },
  {
    step: "04",
    title: "Export and refine",
    copy: "Move the selected draft into your codebase and continue polishing.",
  },
] as const;

const capabilities = [
  "Admin dashboards",
  "SaaS landing pages",
  "Billing screens",
  "CRM workspaces",
  "Education panels",
  "POS analytics",
  "Regulatory reports",
  "Internal tools",
] as const;

const templates = [
  {
    name: "Executive Dashboard",
    description: "Metrics, growth chart, active users, revenue trend, and alerts.",
  },
  {
    name: "Finance Control Room",
    description: "Cashflow, invoice aging, expense table, and approval states.",
  },
  {
    name: "School Admin System",
    description: "Student data, attendance summary, schedules, and report actions.",
  },
  {
    name: "Retail Operations",
    description: "Sales performance, inventory movement, outlet comparison, and shifts.",
  },
  {
    name: "CRM Pipeline",
    description: "Deals, account detail, next tasks, timeline, and team activity.",
  },
  {
    name: "Compliance Workspace",
    description: "Validation queue, document status, export history, and audit trail.",
  },
] as const;

const pricing = [
  {
    name: "Starter",
    price: "$9",
    description: "For builders testing project generation.",
    features: ["50 credits", "Template gallery", "Basic export"],
    cta: "Start Starter",
    highlighted: false,
  },
  {
    name: "Builder",
    price: "$19",
    description: "For freelancers and product builders shipping fast.",
    features: ["180 credits", "Project variants", "Code handoff"],
    cta: "Choose Builder",
    highlighted: true,
  },
  {
    name: "Studio",
    price: "$49",
    description: "For teams standardizing generated UI workflows.",
    features: ["600 credits", "Workspace review", "Design-system rules"],
    cta: "Choose Studio",
    highlighted: false,
  },
] as const;

const footerGroups = [
  {
    title: "Product",
    links: ["Generator", "Projects", "Templates", "Exports"],
  },
  {
    title: "Use cases",
    links: ["SaaS", "Dashboard", "Admin Panel", "Internal Tool"],
  },
  {
    title: "Resources",
    links: ["Docs", "Changelog", "Examples", "Roadmap"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Security", "Terms"],
  },
] as const;

type ProjectItem = {
  title: string;
  category: string;
  description: string;
};

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="landing-shell min-h-screen selection:bg-planetary selection:text-white">
        <SiteHeader />
        <HeroSection />
        <ProjectsSection />
        <GeneratorSection />
        <WorkflowSection />
        <TemplateSection />
        <CapabilitySection />
        <PricingSection />
        <FinalCta />
        <SiteFooter />
      </main>
    </MotionConfig>
  );
}

function HeroSection() {
  return (
    <section className="landing-hero relative">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20"
      >
        <div className="text-center lg:text-left">
          <motion.span
            variants={fadeUp}
            className="landing-pill inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium tracking-normal"
          >
            Generate dashboards, admin panels, and landing pages from one brief
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-normal sm:text-5xl lg:text-6xl"
          >
            Build project UI like a senior product team.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="landing-text-soft mx-auto mt-6 max-w-xl text-base leading-7 sm:text-lg lg:mx-0"
          >
            Generate structured interfaces for SaaS dashboards, admin panels,
            internal tools, and landing pages — with clear sections, responsive
            states, and export-ready layouts.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              href="/app/studio/demo"
              prefetch={false}
              className="landing-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Start generating
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>

            <Link
              href="#projects"
              className="landing-secondary-button inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Explore project examples
            </Link>
          </motion.div>

          <motion.dl
            variants={fadeUp}
            className="mt-10 grid max-w-md grid-cols-3 gap-6 lg:max-w-none"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold tabular-nums sm:text-3xl">{stat.value}</dd>
                <p className="landing-text-muted mt-1 text-xs leading-5 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div variants={fadeUp} className="relative">
          <HeroStudioPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroStudioPreview() {
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
          <aside className="landing-section-soft hidden border-r p-4 text-left lg:block">
            <p className="landing-text-muted text-xs font-semibold uppercase tracking-normal">
              Project pages
            </p>
            <div className="mt-4 grid gap-2">
              {["Overview", "Billing", "Customers", "Settings", "Empty states"].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-lg border border-landing-border px-3 py-2 text-xs font-semibold",
                    index === 0 ? "bg-planetary/10 text-planetary" : "bg-sky/60",
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
              <span className="landing-pill-muted rounded-full px-3 py-1 text-xs font-semibold">
                Export ready
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="MRR" value="$42.8k" meta="+18.2%" variant="primary" />
              <MetricCard label="Customers" value="2,481" meta="+214" variant="sky" />
              <MetricCard label="Usage" value="78%" meta="Healthy" variant="venus" />
            </div>

            <div className="landing-card-solid mt-4 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Revenue movement</p>
                <p className="landing-text-muted text-xs">Generated chart</p>
              </div>
              <div className="mt-6 flex h-32 items-end gap-1.5" aria-hidden="true">
                {[44, 72, 60, 90, 76, 110, 92, 132, 104, 148, 120, 162].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={cn(
                      "flex-1 rounded-t-md bg-venus",
                      index > 5 && "bg-universe",
                      index > 8 && "bg-planetary",
                    )}
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

function MetricCard({
  label,
  value,
  meta,
  variant,
}: {
  label: string;
  value: string;
  meta: string;
  variant: "primary" | "sky" | "venus";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-landing-border p-4",
        variant === "primary" && "bg-planetary text-white",
        variant === "sky" && "bg-sky text-galaxy",
        variant === "venus" && "bg-venus text-galaxy",
      )}
    >
      <p className={cn("text-xs font-semibold", variant === "primary" ? "text-white/70" : "landing-text-muted")}>
        {label}
      </p>
      <p className="mt-3 text-xl font-bold tabular-nums tracking-normal">{value}</p>
      <p className={cn("mt-1 text-xs", variant === "primary" ? "text-white/70" : "landing-text-muted")}>
        {meta}
      </p>
    </div>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="landing-section-blue border-y px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Project examples"
          title="Start from project patterns, not a blank screen."
          copy="Every example is a structured product surface — pages, sections, tables, and states you can generate and refine."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((item) => (
            <motion.div key={item.title} variants={fadeUp}>
              <ProjectCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ProjectCard({ item }: { item: ProjectItem }) {
  return (
    <article className="landing-card landing-card-hover h-full rounded-2xl p-4 transition hover:-translate-y-1">
      <div className="landing-preview rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="landing-text-muted text-xs font-semibold uppercase tracking-normal">
            {item.category}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <span className="h-14 rounded-lg bg-sky/70" />
          <span className="h-14 rounded-lg bg-venus/60" />
          <span className="h-14 rounded-lg bg-meteor" />
        </div>
        <div className="mt-3 grid gap-2">
          <span className="h-2 rounded-full bg-galaxy/12" />
          <span className="h-2 w-4/5 rounded-full bg-galaxy/12" />
        </div>
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-normal">{item.title}</h3>
      <p className="landing-text-soft mt-2 text-sm leading-6">{item.description}</p>
    </article>
  );
}

function GeneratorSection() {
  return (
    <section id="generator" className="px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <SectionHeader
          align="left"
          eyebrow="Generator"
          title="Turn one product idea into a complete UI direction."
          copy="The generator does not stop at a pretty screen. It creates a project structure: pages, sections, components, states, and the visual rules your team can continue from."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="landing-card-blue rounded-2xl p-4"
        >
          <div className="landing-card-solid rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-landing-border pb-5">
              <div>
                <p className="text-lg font-bold tracking-normal">Generation brief</p>
                <p className="landing-text-muted mt-1 text-sm">
                  Input quality shapes the project output.
                </p>
              </div>
              <span className="rounded-full bg-planetary px-3 py-1 text-xs font-semibold text-white">
                Ready
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-xl border border-landing-border bg-sky/60 p-4">
                <p className="text-sm font-semibold">Prompt</p>
                <div className="landing-card-solid mt-4 rounded-xl p-4 text-sm leading-6">
                  Generate a modern school admin dashboard with attendance summary,
                  student records, class schedule, report export, and a mobile
                  responsive layout.
                </div>
              </div>

              <div className="landing-card-solid rounded-xl p-4">
                <p className="text-sm font-semibold">Generated structure</p>
                <div className="mt-4 grid gap-2">
                  {["Landing page", "Dashboard overview", "Data table", "Detail page", "Settings", "Empty state"].map((row, index) => (
                    <div
                      key={row}
                      className={cn(
                        "flex items-center justify-between rounded-lg border border-landing-border px-3 py-2 text-sm",
                        index === 0 ? "bg-planetary/10" : "bg-sky/50",
                      )}
                    >
                      <span className="font-medium">{row}</span>
                      <span className="font-mono text-xs text-galaxy/55">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="landing-section-soft border-y px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <SectionHeader
          align="left"
          eyebrow="Workflow"
          title="From rough idea to usable project draft."
          copy="A clean workflow keeps the result practical: project type, pages, sections, states, layout rules, then export."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="grid gap-3 sm:grid-cols-2"
        >
          {workflow.map((item) => (
            <motion.article
              key={item.step}
              variants={fadeUp}
              className="landing-card rounded-2xl p-5"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-planetary font-mono text-sm font-semibold text-white">
                {item.step}
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-normal">{item.title}</h3>
              <p className="landing-text-soft mt-2 text-sm leading-6">{item.copy}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TemplateSection() {
  return (
    <section id="templates" className="px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            align="left"
            eyebrow="Templates"
            title="Project templates that feel like real products."
            copy="Use these as starting blocks for dashboards, SaaS pages, internal tools, and complex admin systems."
          />

          <Link
            href="/templates"
            className="landing-secondary-button inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Browse all templates
          </Link>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {templates.map((template, index) => (
            <motion.article
              key={template.name}
              variants={fadeUp}
              className="landing-card landing-card-hover rounded-2xl p-4 transition hover:-translate-y-1"
            >
              <div
                className={cn(
                  "rounded-xl border border-landing-border p-4",
                  index % 3 === 0 && "bg-sky/70",
                  index % 3 === 1 && "bg-venus/60",
                  index % 3 === 2 && "bg-universe/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="h-2 w-24 rounded-full bg-galaxy/14" />
                  <span className="font-mono text-xs text-galaxy/50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <span className="h-12 rounded-lg bg-meteor" />
                  <span className="h-12 rounded-lg bg-meteor" />
                  <span className="h-12 rounded-lg bg-meteor" />
                </div>
                <div className="mt-3 grid gap-2">
                  <span className="h-2 rounded-full bg-galaxy/10" />
                  <span className="h-2 w-4/5 rounded-full bg-galaxy/10" />
                </div>
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-normal">{template.name}</h3>
              <p className="landing-text-soft mt-2 text-sm leading-6">{template.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CapabilitySection() {
  return (
    <section className="landing-section-blue border-y px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Use cases"
          title="One generator for many product surfaces."
          copy="Choose the project type, generate structured UI, then refine it into your own production design."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {capabilities.map((item) => (
            <motion.div
              key={item}
              variants={fadeUp}
              className="landing-card flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <Check className="size-4 shrink-0 text-planetary" aria-hidden="true" />
              {item}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Pricing"
          title="Credit-based plans for generating more projects."
          copy="Simple credits fit this product better than forcing a heavy SaaS subscription before users see value."
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
          {pricing.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                plan.highlighted
                  ? "border-planetary bg-planetary text-white shadow-brand"
                  : "landing-card",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-bold tracking-normal">{plan.name}</h3>
                {plan.highlighted ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                    Popular
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums tracking-normal">{plan.price}</span>
                <span className={cn("text-sm", plan.highlighted ? "text-white/70" : "landing-text-muted")}>
                  / month
                </span>
              </div>

              <p
                className={cn(
                  "mt-3 min-h-10 text-sm leading-6",
                  plan.highlighted ? "text-white/75" : "landing-text-soft",
                )}
              >
                {plan.description}
              </p>

              <ul className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check
                      className={cn("size-4 shrink-0", plan.highlighted ? "text-white" : "text-planetary")}
                      aria-hidden="true"
                    />
                    <span className={plan.highlighted ? "text-white/85" : "landing-text-soft"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/app/studio/demo"
                prefetch={false}
                className={cn(
                  "mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition hover:-translate-y-0.5",
                  plan.highlighted
                    ? "bg-meteor text-galaxy hover:brightness-95"
                    : "landing-primary-button",
                )}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 pt-4 sm:px-6">
      <div className="landing-cta mx-auto max-w-7xl rounded-3xl p-8 text-center text-white sm:p-14">
        <p className="text-xs font-semibold uppercase tracking-normal text-white/70">
          Generate your next project
        </p>

        <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-bold tracking-normal sm:text-4xl">
          Stop designing every project from zero.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/75">
          Create a clean UI direction, preview project templates, and ship dashboard
          interfaces faster — without making your product look generic.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/app/studio/demo"
            prefetch={false}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-meteor px-6 text-sm font-semibold text-galaxy transition hover:-translate-y-0.5 hover:brightness-95"
          >
            Open generator
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="#projects"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            View examples
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-landing-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark />
            <p className="text-sm font-semibold tracking-normal">DashboardCraft</p>
          </div>
          <p className="landing-text-soft mt-4 max-w-sm text-sm leading-6">
            Project UI generator for dashboards, admin panels, SaaS pages, and
            internal tools.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-4">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold">{group.title}</p>
              <ul className="landing-text-soft mt-4 grid gap-3 text-sm">
                {group.links.map((link) => (
                  <li key={link}>
                    <Link href="/" className="transition hover:text-galaxy">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-text-soft mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-landing-border pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 DashboardCraft. All rights reserved.</p>
        <p>Built for production interface teams.</p>
      </div>
    </footer>
  );
}

function LogoMark() {
  return (
    <div className="landing-brand-mark grid size-9 place-items-center rounded-xl text-sm font-semibold">
      D
    </div>
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
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={fadeUp}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}
    >
      <p className="landing-text-muted text-xs font-semibold uppercase tracking-normal">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-bold tracking-normal sm:text-4xl">
        {title}
      </h2>
      <p className="landing-text-soft mt-4 leading-7">{copy}</p>
    </motion.div>
  );
}
