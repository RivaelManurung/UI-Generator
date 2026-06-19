"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Layers3, Loader2, Search } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
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
    <main className="landing-shell min-h-screen selection:bg-planetary selection:text-white">
      <SiteHeader />

      <section className="landing-hero">
        <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="landing-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-normal">
            <Code2 className="size-3.5 text-planetary" aria-hidden="true" />
            Free Templates
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-normal sm:text-5xl">
            Download free <span className="text-planetary">UI templates</span>.
          </h1>
          <p className="landing-text-soft mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            Generated templates you can preview, then copy the HTML or TSX and drop straight into your projects
            — for free.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
                    className="h-8 cursor-pointer px-3 capitalize transition-colors hover:border-planetary/40"
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
            <Loader2 className="size-6 animate-spin text-planetary" aria-label="Loading templates" />
          </div>
        ) : (
          <>
            <p className="landing-text-muted mt-6 text-sm">
              {filtered.length} {filtered.length === 1 ? "template" : "templates"} available
              {activeCategory !== "All" ? ` in ${activeCategory}` : ""}.
            </p>

            {filtered.length === 0 ? (
              <div className="landing-card mt-10 rounded-2xl border-dashed px-6 py-16 text-center">
                <p className="text-base font-semibold">No templates yet</p>
                <p className="landing-text-muted mt-1 text-sm">Published free templates will appear here.</p>
              </div>
            ) : (
              <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
                {filtered.map((template) => (
                  <RevealItem key={template.slug} className="h-full">
                    <FreeTemplateCard template={template} designSystems={designSystems} onOpen={setOpenSlug} />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </>
        )}
      </section>

      <section className="px-4 pb-24 pt-4 sm:px-6">
        <Reveal className="landing-cta mx-auto max-w-7xl rounded-3xl px-6 py-12 text-center text-white sm:px-12">
          <Layers3 className="mx-auto size-8" aria-hidden="true" />
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-bold tracking-normal">
            Want a template tailored to your data?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance leading-7 text-white/90">
            Describe your domain and DashboardCraft generates a validated, schema-first dashboard you can preview
            and export.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-meteor px-6 text-sm font-semibold text-galaxy transition hover:-translate-y-0.5 hover:brightness-95"
            >
              Start building free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </Reveal>
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
