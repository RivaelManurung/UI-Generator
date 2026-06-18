"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Eye, Layers3, Search, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { seedTemplates } from "@/data/seed";
import type { Template } from "@/lib/api/types";

const categories = [
  "All",
  ...Array.from(new Set(seedTemplates.map((template) => template.category))),
];

export default function PublicTemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return seedTemplates.filter((template) => {
      const matchesCategory =
        activeCategory === "All" || template.category === activeCategory;
      const matchesSearch =
        search.length === 0 ||
        template.title.toLowerCase().includes(search) ||
        template.description.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query]);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="glow pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="gap-2" variant="secondary">
              <ShieldCheck className="size-3.5 text-primary" />
              Validated template gallery
            </Badge>
            <h1 className="text-balance mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Start from dashboard patterns your team can{" "}
              <span className="text-primary">actually ship</span>.
            </h1>
            <p className="text-balance mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Browse production-shaped templates with controlled schemas, safe previews, and
              component compositions ready for DashboardCraft Studio.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-foreground">6</span> domains
              </span>
              <Separator className="hidden h-4 sm:block" orientation="vertical" />
              <span className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-foreground">48+</span> components
              </span>
              <Separator className="hidden h-4 sm:block" orientation="vertical" />
              <span className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-foreground">100%</span> schema-first
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search templates"
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates..."
              value={query}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = category === activeCategory;
              return (
                <Badge
                  asChild
                  key={category}
                  variant={active ? "default" : "outline"}
                >
                  <button
                    className="h-8 cursor-pointer px-3 transition-colors hover:border-primary/40"
                    onClick={() => setActiveCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "template" : "templates"}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}.
        </p>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <p className="text-base font-semibold">No templates found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or category filter.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </section>

      {/* Footer CTA band */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm sm:px-12">
            <div className="glow pointer-events-none absolute inset-x-0 top-0 h-40" />
            <div className="relative">
              <Layers3 className="mx-auto size-8 text-primary" />
              <h2 className="text-balance mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight">
                Can&apos;t find the right starting point?
              </h2>
              <p className="text-balance mx-auto mt-3 max-w-xl text-muted-foreground">
                Describe your domain and DashboardCraft will generate a validated,
                schema-first dashboard tailored to your data.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Start building free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const isPremium = template.tier === "Premium";
  return (
    <Card className="group flex flex-col overflow-hidden border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <CardHeader className="gap-0 p-4">
        <TemplatePreview category={template.category} />
        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge variant="secondary">{template.category}</Badge>
          <Badge
            className={isPremium ? "gap-1" : ""}
            variant={isPremium ? "default" : "outline"}
          >
            {isPremium ? <Crown className="size-3" /> : null}
            {template.tier}
          </Badge>
        </div>
        <CardTitle className="mt-3 text-lg leading-tight">{template.title}</CardTitle>
        <CardDescription className="mt-1.5 min-h-10">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="flex items-center gap-2 capitalize text-muted-foreground">
            <Layers3 className="size-4" />
            {template.pageType}
          </span>
          <span className="font-semibold">{template.componentCount} components</span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" size="sm" variant="ghost">
            <Eye className="size-4" />
            Preview
          </Button>
          <Button asChild className="flex-1" size="sm">
            <Link href="/register">
              Use template
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreview({ category }: { category: string }) {
  const isTable = category === "Education" || category === "Inventory";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-galaxy p-3">
      <div className="absolute right-3 top-3 rounded-full bg-venus px-2 py-1 text-[10px] font-bold text-galaxy">
        schema.valid
      </div>
      <div className="flex h-44 gap-3 rounded-lg bg-white p-3">
        <div className="hidden w-16 rounded-md bg-galaxy p-2 sm:block">
          <div className="h-4 w-8 rounded bg-primary" />
          <div className="mt-5 grid gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-2 rounded bg-white/20" key={item} />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-3 w-28 rounded bg-galaxy" />
              <div className="mt-2 h-2 w-20 rounded bg-venus" />
            </div>
            <div className="h-7 w-16 rounded-md bg-primary/15" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div className="rounded-md border border-venus bg-sky/35 p-2" key={item}>
                <div className="h-2 rounded bg-venus" />
                <div className="mt-3 h-4 w-12 rounded bg-galaxy" />
              </div>
            ))}
          </div>
          {isTable ? (
            <div className="mt-3 rounded-md border border-venus">
              {[1, 2, 3].map((row) => (
                <div
                  className="grid grid-cols-4 gap-2 border-b border-venus px-2 py-1.5 last:border-b-0"
                  key={row}
                >
                  <div className="h-2 rounded bg-venus" />
                  <div className="h-2 rounded bg-venus" />
                  <div className="h-2 rounded bg-venus" />
                  <div className="h-2 rounded bg-primary/20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex h-14 items-end gap-1 rounded-md bg-sky/35 p-2">
              {[24, 38, 32, 48, 42, 56, 50].map((height) => (
                <div
                  className="flex-1 rounded-t bg-primary"
                  key={height}
                  style={{ height }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
