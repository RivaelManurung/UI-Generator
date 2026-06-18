"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Layers3, Loader2, Search } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreeTemplateCard } from "@/components/freebies/free-template-card";
import { FreeTemplatePreviewDialog } from "@/components/freebies/free-template-preview-dialog";
import { useDesignSystems } from "@/hooks/use-design-systems";
import { freeTemplateService } from "@/lib/services/free-template-service";
import type { FreeTemplate } from "@/types/free-template";

export default function PublicTemplatesPage() {
  const [templates, setTemplates] = useState<FreeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const designSystems = useDesignSystems();

  useEffect(() => {
    let cancelled = false;
    freeTemplateService
      .listPublic()
      .then((list) => {
        if (!cancelled) setTemplates(list);
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

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(templates.map((t) => t.category || t.pageType)))],
    [templates],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return templates.filter((t) => {
      const cat = t.category || t.pageType;
      const matchesCategory = activeCategory === "All" || cat === activeCategory;
      const matchesSearch =
        search.length === 0 ||
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        cat.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, query]);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="glow pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center sm:py-20">
          <Badge className="gap-2" variant="secondary">
            <Code2 className="size-3.5 text-primary" />
            Free Templates
          </Badge>
          <h1 className="text-balance mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-normal sm:text-5xl">
            Download free <span className="text-primary">UI templates</span>.
          </h1>
          <p className="text-balance mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Browse our collection of generated templates — responsive layouts you can preview, then copy the
            HTML or TSX and use in your projects for free.
          </p>
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
                <Badge asChild key={category} variant={active ? "default" : "outline"}>
                  <button
                    className="h-8 cursor-pointer px-3 capitalize transition-colors hover:border-primary/40"
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

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading templates" />
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "template" : "templates"} available
              {activeCategory !== "All" ? ` in ${activeCategory}` : ""}.
            </p>

            {filtered.length === 0 ? (
              <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
                <p className="text-base font-semibold">No templates yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Published free templates will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((template) => (
                  <FreeTemplateCard
                    key={template.slug}
                    template={template}
                    designSystems={designSystems}
                    onOpen={setOpenSlug}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer CTA band */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm sm:px-12">
            <div className="glow pointer-events-none absolute inset-x-0 top-0 h-40" />
            <div className="relative">
              <Layers3 className="mx-auto size-8 text-primary" />
              <h2 className="text-balance mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-normal">
                Want a template tailored to your data?
              </h2>
              <p className="text-balance mx-auto mt-3 max-w-xl text-muted-foreground">
                Describe your domain and DashboardCraft will generate a validated, schema-first dashboard
                you can preview and export.
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

      <FreeTemplatePreviewDialog
        slug={openSlug}
        open={openSlug !== null}
        onOpenChange={(o) => {
          if (!o) setOpenSlug(null);
        }}
        designSystems={designSystems}
      />
    </main>
  );
}
