"use client";

import { FolderOpen, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

// Shown on studio entry (and from the header switcher): create a new project or
// continue an existing one. Modal layout = fixed header + CTA, a single
// scrollable list region (capped to the dialog), and a fixed footer.
export function StudioStartDialog({
  open,
  onOpenChange,
  projects,
  currentProjectId,
  onOpen,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  currentProjectId: string | null;
  onOpen: (projectId: string) => void;
  onCreate: () => void;
}) {
  const hasProjects = projects.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[520px]">
        <DialogHeader className="space-y-1 border-b border-border p-5 pb-4 pr-10 text-left">
          <DialogTitle>Open the Studio</DialogTitle>
          <DialogDescription className="text-xs">
            Create a new project or continue one you&apos;ve already started.
          </DialogDescription>
        </DialogHeader>

        {/* Create CTA — fixed */}
        <div className="p-5 pb-3">
          <button
            type="button"
            onClick={onCreate}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">Create new project</span>
              <span className="block text-xs text-muted-foreground">
                Start a fresh dashboard and generate from a prompt.
              </span>
            </span>
          </button>
        </div>

        {hasProjects ? (
          <p className="px-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Open existing
          </p>
        ) : null}

        {/* Scrollable list — the ONLY scroll region, bounded by the dialog */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {hasProjects ? (
            <div className="grid gap-2 pb-3">
              {projects.map((project) => {
                const isCurrent = project.id === currentProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onOpen(project.id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <FolderOpen className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {project.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {project.pagesCount} {project.pagesCount === 1 ? "page" : "pages"}
                          {project.domain ? ` · ${project.domain}` : ""}
                        </span>
                      </span>
                    </span>
                    {isCurrent ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Current
                      </Badge>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
              No projects yet — create your first one above.
            </div>
          )}
        </div>

        {/* Footer — fixed */}
        <div className="border-t border-border p-3">
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Start blank
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
