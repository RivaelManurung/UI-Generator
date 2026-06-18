"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Code2,
  History,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useGenerationVersions } from "@/hooks/use-generation-versions";
import type { ProjectStatus } from "@/types/project";
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

function truncate(value: string, max = 90) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? "";
  const router = useRouter();

  const { projects, loading: projectsLoading, deleteProject } = useProjects();
  const {
    versions,
    activeVersion,
    loading: versionsLoading,
    restoreVersion,
  } = useGenerationVersions(projectId);

  const project = projects.find((p) => p.id === projectId);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success("Project deleted");
      router.push("/app/projects");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      const restored = await restoreVersion(versionId);
      if (restored) toast.success(`Restored version v${restored.versionNumber}`);
      else toast.error("Failed to restore version");
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  };

  const headerActions = (
    <Button size="sm" asChild aria-label="Open studio for this project">
      <Link href={`/app/studio/${projectId}`}>
        <Code2 className="h-4 w-4" />
        Open Studio
      </Link>
    </Button>
  );

  const title = project?.name ?? (projectsLoading ? "Loading project…" : "Project not found");

  return (
    <AppShell
      title={title}
      subtitle={project?.description || `Project ID: ${projectId}`}
      actions={headerActions}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 tracking-normal">
                <History className="h-4 w-4 text-primary" />
                Generation versions
              </CardTitle>
              <CardDescription>Validated layouts produced for this project.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {versionsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
                <p className="text-sm font-semibold">No versions yet</p>
                <p className="text-xs text-muted-foreground font-medium">
                  Open Studio to generate the first version of this project.
                </p>
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
                  href={`/app/studio/${projectId}`}
                >
                  <Code2 className="h-4 w-4" />
                  Open Studio
                </Link>
              </div>
            ) : (
              versions.map((version) => {
                const isActive = activeVersion?.id === version.id;
                return (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30",
                      isActive && "border-primary/40 bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">
                          v{version.versionNumber}
                        </p>
                        {isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-primary text-primary-foreground border-transparent"
                          >
                            active
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-medium">
                        {truncate(version.prompt)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground font-semibold">
                        Quality{" "}
                        <span className="tabular-nums">{version.qualityScore}</span> ·{" "}
                        {formatDate(version.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version.id)}
                          disabled={restoringId === version.id}
                          aria-label={`Restore version v${version.versionNumber}`}
                        >
                          {restoringId === version.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Restore
                        </Button>
                      ) : null}
                      <Link
                        className={cn(buttonVariants({ size: "sm" }))}
                        href={`/app/studio/${projectId}`}
                        aria-label={`Open version v${version.versionNumber} in studio`}
                      >
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="tracking-normal">Project settings</CardTitle>
            <CardDescription>Defaults used by generator requests.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {projectsLoading && !project ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <Info label="Status">
                  {project ? (
                    <Badge
                      variant="outline"
                      className={cn("capitalize", statusStyles[project.status])}
                    >
                      {project.status}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Info>
                <Info label="Domain">
                  <span className="capitalize">{project?.domain || "—"}</span>
                </Info>
                <Info label="Default theme">{project?.defaultThemeSlug || "—"}</Info>
                <Info label="Avg. quality">
                  <span className="tabular-nums font-semibold">
                    {project ? project.qualityAverage : "—"}
                  </span>
                </Info>
              </>
            )}

            <Separator className="my-1" />

            <Link
              className={cn(buttonVariants(), "w-full")}
              href={`/app/studio/${projectId}`}
              aria-label="Open studio to generate"
            >
              <Code2 className="h-4 w-4" />
              Open Studio
            </Link>
            <Button
              variant="outline"
              className="w-full text-rose-600 hover:text-rose-600"
              onClick={() => setConfirmDelete(true)}
              disabled={!project}
              aria-label="Delete this project"
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmDelete(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-normal">Delete project</DialogTitle>
            <DialogDescription>
              {project
                ? `This permanently removes "${project.name}" and its versions. This cannot be undone.`
                : "This permanently removes the project and its versions."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
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

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="text-xs font-bold text-foreground">{children}</div>
    </div>
  );
}
