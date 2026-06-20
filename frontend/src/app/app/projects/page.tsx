"use client";

import { useState } from "react";
import Link from "next/link";
import { Code2, FolderKanban, FolderPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjects } from "@/hooks/use-projects";
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

function initialOf(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export default function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
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
        <SectionCard className="overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72 max-w-full" />
                </div>
                <Skeleton className="hidden h-8 w-28 sm:block" />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : projects.length === 0 ? (
        <Reveal>
          <EmptyState />
        </Reveal>
      ) : (
        <Reveal>
          <SectionCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Project
                    </TableHead>
                    <TableHead className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                      Quality
                    </TableHead>
                    <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                      Pages
                    </TableHead>
                    <TableHead className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:table-cell">
                      Updated
                    </TableHead>
                    <TableHead className="px-5 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="group hover:bg-sky/30">
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-planetary to-universe text-sm font-bold text-white shadow-brand-sm"
                            aria-hidden
                          >
                            {initialOf(project.name)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/app/studio/${project.id}`}
                              className="block truncate font-semibold tracking-normal text-foreground transition-colors group-hover:text-planetary hover:text-planetary"
                            >
                              {project.name}
                            </Link>
                            {project.description ? (
                              <p className="truncate text-sm text-muted-foreground">
                                {project.description}
                              </p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:hidden">
                              <Badge
                                variant="outline"
                                className={cn("capitalize", statusStyles[project.status])}
                              >
                                {project.status}
                              </Badge>
                              <span className="tabular-nums">Quality {project.qualityAverage}</span>
                              <span aria-hidden>·</span>
                              <span className="tabular-nums">
                                {project.pagesCount} {project.pagesCount === 1 ? "page" : "pages"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusStyles[project.status])}
                        >
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-semibold tabular-nums text-galaxy md:table-cell">
                        {project.qualityAverage}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-semibold tabular-nums text-foreground md:table-cell">
                        {project.pagesCount}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {formatDate(project.updatedAt)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" asChild className="bg-primary text-primary-foreground">
                            <Link
                              href={`/app/studio/${project.id}`}
                              aria-label={`Open studio for project ${project.name}`}
                            >
                              <Code2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Open studio</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDelete(project)}
                            aria-label={`Delete project ${project.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </Reveal>
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
