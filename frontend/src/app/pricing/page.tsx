import Link from "next/link";
import { Check, CreditCard, Minus } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$19",
    credits: 100,
    blurb: "For solo developers shipping their first internal tools.",
    popular: false,
    features: ["Schema validation", "Sandbox preview", "Version history", "TSX & HTML export", "Community templates"],
  },
  {
    name: "Pro",
    price: "$49",
    credits: 350,
    blurb: "For freelancers and small teams building dashboards weekly.",
    popular: true,
    features: [
      "Everything in Starter",
      "Section refinement",
      "Premium template cloning",
      "Priority generation queue",
      "Monaco code viewer",
    ],
  },
  {
    name: "Studio",
    price: "$129",
    credits: 1200,
    blurb: "For agencies and product teams operating at scale.",
    popular: false,
    features: [
      "Everything in Pro",
      "Team workspace",
      "Admin console & audit logs",
      "RBAC & ownership controls",
      "Dedicated support",
    ],
  },
];

const matrix = [
  ["Validated schema generation", true, true, true],
  ["Sandboxed preview", true, true, true],
  ["Version history & restore", true, true, true],
  ["Section-level refinement", false, true, true],
  ["Premium templates", false, true, true],
  ["Team workspace", false, false, true],
  ["Admin console & RBAC", false, false, true],
] as const;

const faqs = [
  ["What is a credit?", "One credit equals one successful, schema-validated page generation. Refinements of a single section also cost one credit."],
  ["Do failed generations cost credits?", "No. If generated output fails schema validation, the credit is automatically refunded and recorded in your ledger."],
  ["Can I roll over credits?", "Credits from monthly plans reset each cycle. You can top up one-time credit packs that never expire."],
  ["Is there a free trial?", "Yes — new workspaces start with free credits so you can generate and preview real dashboards before paying."],
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background patterns */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-75" />

      <SiteHeader />

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-border/40 py-20 lg:py-24 z-10">
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Badge variant="secondary" className="gap-2 px-3 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-xs font-semibold">
            <CreditCard className="size-3.5" />
            Simple, credit-based pricing
          </Badge>
          <h1 className="text-balance mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-tight">
            Pricing for controlled generation.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Pay only for successful validated output, keep refunds fully visible, and scale generation with
            predictable credit packs.
          </p>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 relative z-10">
        <div className="grid gap-8 md:grid-cols-3 md:items-stretch lg:gap-10">
          {plans.map((plan) => {
            const perCredit = (parseInt(plan.price.slice(1), 10) / plan.credits).toFixed(2);
            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col justify-between p-8 rounded-[2rem] border transition-all duration-300",
                  "hover:-translate-y-2 hover:shadow-xl",
                  plan.popular
                    ? "border-primary bg-card shadow-lg shadow-primary/10 dark:shadow-primary/2 dark:bg-card/90 md:scale-[1.03] z-10"
                    : "border-border bg-card/60 backdrop-blur-md hover:border-primary/20",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary hover:bg-primary text-primary-foreground border-none px-4 py-1 text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 rounded-full">
                      Most popular
                    </Badge>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">{plan.name}</h3>
                    {plan.popular && (
                      <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2.5 py-0.5 rounded-md">
                        Best Value
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed min-h-12">
                    {plan.blurb}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/month</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-semibold text-primary">
                      {plan.credits.toLocaleString()} credits
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ~${perCredit} / credit
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                  <Link
                    className={cn(
                      buttonVariants({ variant: plan.popular ? "default" : "outline" }),
                      "w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01]",
                      plan.popular 
                        ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10" 
                        : "hover:bg-muted"
                    )}
                    href="/register"
                  >
                    Start {plan.name}
                  </Link>

                  <Separator className="bg-border/60" />

                  <div>
                    <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-4">
                      Key Features
                    </p>
                    <ul className="grid gap-3.5 text-sm">
                      {plan.features.map((feature) => (
                        <li className="flex items-start gap-3" key={feature}>
                          <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Check className="size-3" />
                          </span>
                          <span className="text-foreground/95 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compare table section */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Compare plans</h2>
          <p className="mt-2.5 text-muted-foreground">Detailed breakdown of feature availability across plans.</p>
        </div>
        
        <div className="rounded-2xl border border-border/85 bg-card/65 backdrop-blur-md shadow-md overflow-hidden">
          <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] text-sm">
            <div className="bg-muted/40 px-6 py-4 font-semibold text-foreground border-b border-border/60">Feature</div>
            {plans.map((p) => (
              <div key={p.name} className="bg-muted/40 px-6 py-4 text-center font-bold text-foreground border-b border-border/60">
                {p.name}
              </div>
            ))}
            {matrix.map(([label, ...cells]) => (
              <div key={label as string} className="contents group">
                <div className="border-b border-border/40 px-6 py-4 text-muted-foreground group-last:border-none font-medium flex items-center">{label}</div>
                {cells.map((included, i) => (
                  <div key={i} className="flex items-center justify-center border-b border-border/40 px-6 py-4 group-last:border-none">
                    {included ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <Check className="size-3.5" />
                      </span>
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/30">
                        <Minus className="size-3.5" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="mx-auto max-w-3xl px-4 py-16 pb-24 sm:px-6 relative z-10">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground">Frequently asked questions</h2>
        <div className="mt-10 grid gap-6">
          {faqs.map(([q, a]) => (
            <div
              key={q}
              className="group rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm transition-all duration-300 hover:bg-card/70 hover:border-primary/10"
            >
              <h3 className="text-base font-semibold text-foreground flex items-center gap-3">
                <span className="size-2 rounded-full bg-primary/40 group-hover:bg-primary/80 transition-colors" />
                {q}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground pl-5 border-l border-primary/10 group-hover:border-primary/20 transition-colors">
                {a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
