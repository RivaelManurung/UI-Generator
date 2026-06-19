import { CreditCard } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";

const faqs = [
  ["What is a credit?", "One credit equals one successful, schema-validated page generation. A single section refinement also costs one credit."],
  ["Do failed generations cost credits?", "No. If generated output fails schema validation, the credit is automatically refunded and recorded in your ledger."],
  ["Do credits expire?", "No. Credit packs are one-time top-ups — your credits stay in your wallet until you use them, with no monthly reset."],
  ["How do I pay?", "Securely via Midtrans — QRIS, bank transfer (VA), or e-wallet. Credits are added automatically once your payment settles."],
] as const;

export default function PricingPage() {
  return (
    <main className="landing-shell min-h-screen selection:bg-planetary selection:text-white">
      <SiteHeader />

      <section className="landing-hero">
        <Reveal className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <span className="landing-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-normal">
            <CreditCard className="size-3.5 text-planetary" aria-hidden="true" />
            Simple, credit-based pricing
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-normal sm:text-5xl lg:text-6xl">
            Buy credits, build dashboards.
          </h1>
          <p className="landing-text-soft mx-auto mt-6 max-w-2xl text-base leading-7 sm:text-lg">
            One-time credit packs — pay only for successful, validated output, keep refunds fully visible, and
            your credits never expire.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <PricingPlans redirectTo="/pricing" />
        <p className="landing-text-muted mx-auto mt-10 max-w-2xl text-center text-sm leading-6">
          Every pack includes all themes, HTML/CSS export, UI Edit Mode, color &amp; font customization, and
          responsive output. Premium adds priority support and project management.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 pb-24 sm:px-6">
        <Reveal className="text-center">
          <p className="landing-text-muted text-xs font-semibold uppercase tracking-normal">FAQ</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-normal sm:text-4xl">
            Frequently asked questions
          </h2>
        </Reveal>

        <RevealGroup className="mt-10 grid gap-4">
          {faqs.map(([q, a]) => (
            <RevealItem key={q}>
              <div className="landing-card landing-card-hover group rounded-2xl p-6">
                <h3 className="flex items-center gap-3 text-base font-semibold">
                  <span className="size-2 rounded-full bg-planetary/40 transition-colors group-hover:bg-planetary/80" />
                  {q}
                </h3>
                <p className="landing-text-soft mt-3 border-l border-landing-border pl-5 text-sm leading-6">{a}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    </main>
  );
}
