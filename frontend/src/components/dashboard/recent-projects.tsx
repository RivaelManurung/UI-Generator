"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";

const statusStyles: Record<ProjectStatus, string> = {
  active: "border-success-border bg-success-bg text-success-foreground",
  draft: "border-warning-border bg-warning-bg text-warning-foreground",
  archived: "border-border bg-muted text-muted-foreground",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function RecentProjects({
  projects,
  loading = false,
}: {
  projects: Project[];
  loading?: boolean;
}) {
  const items = projects.slice(0, 5);

  return (
    <SectionCard className="overflow-hidden">
      <SectionCardHeader
        title="Recent projects"
        description="Your latest workspace projects and their status."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/app/studio/demo">New generation</Link>
          </Button>
        }
      />
      <div className="px-5 pb-5">
        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <Skeleton className="h-16 rounded-xl" key={item} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate your first interface to see it here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app/studio/demo">New generation</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-2">
            {items.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/app/studio/${project.id}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                      <Badge variant="outline" className="border-border bg-muted/50 text-foreground">
                        {project.domain}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("capitalize", statusStyles[project.status])}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Updated {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-planetary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
