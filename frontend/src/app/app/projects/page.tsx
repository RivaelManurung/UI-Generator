"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Code2, FolderKanban, FolderPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectPreviewThumb } from "@/components/app/project-preview-thumb";
import { useProjects } from "@/hooks/use-projects";
import { useDesignSystems } from "@/hooks/use-design-systems";
import type { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-success-bg text-success-foreground border-success-border",
  draft: "bg-sky/60 text-galaxy border-planetary/15",
  archived: "bg-muted text-muted-foreground border-border",
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
  const designSystems = useDesignSystems();
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const newProjectAction = (
    <Button size="sm" asChild aria-label="Create new project">
      <Link href="/app/projects/new">
        <FolderPlus className="h-4 w-4" />
        New project
      </Link>
    </Button>
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProject(pendingDelete.id);
      toast.success(`Deleted "${pendingDelete.name}"`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      title="Projects"
      subtitle="Create, inspect, and open dashboard generator projects."
      actions={newProjectAction}
    >
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SectionCard key={index} className="overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </SectionCard>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Reveal>
          <EmptyState />
        </Reveal>
      ) : (
        <RevealGroup className="grid gap-5 md:grid-cols-2" stagger={0.05}>
          {projects.map((project) => (
            <RevealItem key={project.id} className="flex">
              <SectionCard className="group flex w-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
                <ProjectPreviewThumb
                  projectId={project.id}
                  brand={project.name}
                  themeSlug={project.defaultThemeSlug}
                  designSystems={designSystems}
                />
                <CardHeader className="flex-row items-start justify-between space-y-0 pt-5">
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="tracking-normal">
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="transition-colors group-hover:text-planetary hover:text-planetary"
                      >
                        {project.name}
                      </Link>
                    </CardTitle>
                    {project.description ? (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("capitalize shrink-0", statusStyles[project.status])}
                  >
                    {project.status}
                  </Badge>
                </CardHeader>
                <CardContent className="grid flex-1 content-end gap-4">
                  <div className="flex flex-wrap items-stretch gap-2.5">
                    <div className="flex flex-col justify-center rounded-xl border border-planetary/15 bg-sky/40 px-3.5 py-2">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Quality
                      </span>
                      <span className="text-lg font-bold tabular-nums tracking-normal text-galaxy">
                        {project.qualityAverage}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center rounded-xl border border-border bg-card px-3.5 py-2">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Pages
                      </span>
                      <span className="text-lg font-bold tabular-nums tracking-normal text-foreground">
                        {project.pagesCount}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center rounded-xl border border-border bg-card px-3.5 py-2">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Updated
                      </span>
                      <span className="truncate text-sm font-semibold tracking-normal text-foreground">
                        {formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {project.domain ? (
                    <Badge
                      variant="outline"
                      className="w-fit bg-muted/50 text-foreground border-border capitalize"
                    >
                      {project.domain}
                    </Badge>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className={cn(buttonVariants(), "bg-primary text-primary-foreground")}
                      href={`/app/studio/${project.id}`}
                      aria-label={`Open studio for project ${project.name}`}
                    >
                      <Code2 className="h-4 w-4" />
                      Open studio
                    </Link>
                    <Link
                      className={cn(buttonVariants({ variant: "outline" }), "group/details")}
                      href={`/app/projects/${project.id}`}
                      aria-label={`View details of project ${project.name}`}
                    >
                      Details
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover/details:translate-x-0.5 group-hover/details:-translate-y-0.5 group-hover/details:text-planetary" />
                    </Link>
                    <Button
                      variant="outline"
                      className="ml-auto text-destructive hover:text-destructive hover:border-destructive/30"
                      onClick={() => setPendingDelete(project)}
                      aria-label={`Delete project ${project.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </SectionCard>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-normal">Delete project</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `This permanently removes "${pendingDelete.name}" and its versions. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <SectionCard className="group border-dashed">
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky/60 text-planetary transition-colors group-hover:bg-planetary group-hover:text-white">
          <FolderKanban className="h-7 w-7" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <p className="text-base font-bold tracking-normal text-foreground">No projects yet</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Create your first project to start generating dashboard pages.
          </p>
        </div>
        <Button asChild aria-label="Create new project">
          <Link href="/app/projects/new">
            <FolderPlus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>
    </SectionCard>
  );
}
