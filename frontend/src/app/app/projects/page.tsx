"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Code2, FolderKanban, FolderPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectPreviewThumb } from "@/components/app/project-preview-thumb";
import { useProjects } from "@/hooks/use-projects";
import { useDesignSystems } from "@/hooks/use-design-systems";
import type { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-secondary text-secondary-foreground border-transparent",
  draft: "bg-muted text-muted-foreground border-border",
  archived: "bg-transparent text-muted-foreground border-border",
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
            <Card key={index}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-sm">
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
                      className="hover:text-primary"
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
                <div className="flex flex-wrap items-center gap-2">
                  {project.domain ? (
                    <Badge variant="outline" className="bg-muted/40 text-foreground border-transparent capitalize">
                      {project.domain}
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground font-medium">
                    {project.pagesCount} {project.pagesCount === 1 ? "page" : "pages"}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Quality{" "}
                    <span className="tabular-nums font-semibold text-foreground">
                      {project.qualityAverage}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Updated {formatDate(project.updatedAt)}
                  </span>
                </div>
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
                    className={cn(buttonVariants({ variant: "outline" }))}
                    href={`/app/projects/${project.id}`}
                    aria-label={`View details of project ${project.name}`}
                  >
                    Details
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="outline"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(project)}
                    aria-label={`Delete project ${project.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
          <FolderKanban className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No projects yet</p>
          <p className="text-xs text-muted-foreground leading-5 font-medium">
            Create your first project to start generating dashboard pages.
          </p>
        </div>
        <Button asChild aria-label="Create new project">
          <Link href="/app/projects/new">
            <FolderPlus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
