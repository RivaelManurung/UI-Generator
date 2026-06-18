"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { creditService } from "@/lib/services/credit-service";
import { useCheckout } from "@/lib/payments/use-checkout";
import type { CreditPackage } from "@/types/credit";

const INCLUDED = [
  "All themes included",
  "HTML/CSS export",
  "UI Edit Mode",
  "Color & font customization",
  "Responsive ready",
];

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PricingPlans({
  redirectTo = "/pricing",
  onPaid,
}: {
  redirectTo?: string;
  onPaid?: () => void;
}) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startCheckout, busySlug } = useCheckout({ redirectTo, onPaid });

  useEffect(() => {
    let cancelled = false;
    creditService
      .listPackages()
      .then((list) => {
        if (!cancelled) {
          setPackages(list);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load packages. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading packages" />
      </div>
    );
  }
  if (error) {
    return <p className="text-center text-sm font-medium text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-3 md:items-stretch lg:gap-10">
      {packages.map((pkg) => {
        const popular = pkg.slug === "premium";
        const perCredit = formatIdr(Math.round(pkg.priceIdr / pkg.credits));
        return (
          <div
            key={pkg.slug}
            className={cn(
              "relative flex flex-col justify-between rounded-[2rem] border p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl",
              popular
                ? "z-10 border-primary bg-card shadow-lg shadow-primary/10 md:scale-[1.03]"
                : "border-border bg-card/60 backdrop-blur-md hover:border-primary/20",
            )}
          >
            {popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="rounded-full border-none bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md">
                  Most popular
                </Badge>
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-foreground">{pkg.name}</h3>
              <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{pkg.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">{formatIdr(pkg.priceIdr)}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {pkg.credits} credits
                </span>
                <span className="text-xs text-muted-foreground">{perCredit} / credit</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              <Button
                onClick={() => startCheckout(pkg.slug)}
                disabled={busySlug !== null}
                variant={popular ? "default" : "outline"}
                className="h-11 w-full rounded-xl text-sm font-semibold"
                aria-label={`Buy the ${pkg.name} pack`}
              >
                {busySlug === pkg.slug ? <Loader2 className="size-4 animate-spin" /> : null}
                Get {pkg.name}
              </Button>

              <ul className="grid gap-3 text-sm">
                {INCLUDED.map((feature) => (
                  <li className="flex items-start gap-3" key={feature}>
                    <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                      <Check className="size-3" />
                    </span>
                    <span className="leading-relaxed text-foreground/95">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
