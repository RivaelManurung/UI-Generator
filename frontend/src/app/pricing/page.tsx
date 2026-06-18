import { CreditCard } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { PricingPlans } from "@/components/pricing/pricing-plans";

const faqs = [
  ["What is a credit?", "One credit equals one successful, schema-validated page generation. A single section refinement also costs one credit."],
  ["Do failed generations cost credits?", "No. If generated output fails schema validation, the credit is automatically refunded and recorded in your ledger."],
  ["Do credits expire?", "No. Credit packs are one-time top-ups — your credits stay in your wallet until you use them, with no monthly reset."],
  ["How do I pay?", "Securely via Midtrans — QRIS, bank transfer (VA), or e-wallet. Credits are added automatically once your payment settles."],
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background patterns */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-75" />

      <SiteHeader />

      {/* Hero section */}
      <section className="relative z-10 overflow-hidden border-b border-border/40 py-20 lg:py-24">
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Badge
            variant="secondary"
            className="gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <CreditCard className="size-3.5" />
            Simple, credit-based pricing
          </Badge>
          <h1 className="text-balance mt-6 text-4xl font-extrabold tracking-normal leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Buy credits, build dashboards.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            One-time credit packs — pay only for successful, validated output, keep refunds fully visible,
            and your credits never expire.
          </p>
        </div>
      </section>

      {/* Pricing packages (live from the server) */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <PricingPlans redirectTo="/pricing" />
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Every pack includes all themes, HTML/CSS export, UI Edit Mode, color &amp; font customization, and
          responsive output. Premium adds priority support and project management.
        </p>
      </section>

      {/* FAQ section */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 py-16 pb-24 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-normal text-foreground">
          Frequently asked questions
        </h2>
        <div className="mt-10 grid gap-6">
          {faqs.map(([q, a]) => (
            <div
              key={q}
              className="group rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm transition-all duration-300 hover:border-primary/10 hover:bg-card/70"
            >
              <h3 className="flex items-center gap-3 text-base font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary/40 transition-colors group-hover:bg-primary/80" />
                {q}
              </h3>
              <p className="mt-3 border-l border-primary/10 pl-5 text-sm leading-relaxed text-muted-foreground transition-colors group-hover:border-primary/20">
                {a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
