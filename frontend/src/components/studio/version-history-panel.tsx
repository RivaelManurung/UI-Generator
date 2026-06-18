"use client";

import { Check, GitBranch, History, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { GenerationVersion } from "@/types/generation";

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: GenerationVersion[];
  activeVersionId?: string;
  onRestore: (versionId: string) => void;
}

export function VersionHistoryPanel({
  open,
  onOpenChange,
  versions,
  activeVersionId,
  onRestore,
}: VersionHistoryPanelProps) {
  const orderedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-border p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
              <History className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold tracking-tight">
                Version history
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-5">
                Review generated versions, compare prompt changes, and restore a
                previous page state.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryItem label="Versions" value={versions.length} />
            <SummaryItem
              label="Active"
              value={
                activeVersionId
                  ? versions.find((item) => item.id === activeVersionId)
                      ?.versionNumber ?? "-"
                  : "-"
              }
            />
            <SummaryItem
              label="Latest"
              value={versions[versions.length - 1]?.versionNumber ?? "-"}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {orderedVersions.length > 0 ? (
            <div className="relative grid gap-3">
              <div className="absolute bottom-4 left-[18px] top-4 w-px bg-border" />

              {orderedVersions.map((version) => {
                const isActive = activeVersionId === version.id;

                return (
                  <article
                    key={version.id}
                    className={cn(
                      "relative rounded-xl border bg-card p-4 shadow-sm transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/35",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute -left-[2px] top-5 z-10 grid h-10 w-10 place-items-center rounded-full border bg-background",
                        isActive
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {isActive ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <GitBranch className="h-4 w-4" />
                      )}
                    </div>

                    <div className="pl-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold tracking-tight">
                              Version {version.versionNumber}
                            </h3>

                            {isActive ? (
                              <Badge variant="secondary" className="h-5">
                                Active
                              </Badge>
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {version.createdAt}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className="shrink-0 font-mono text-xs"
                        >
                          {version.qualityScore}%
                        </Badge>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {version.prompt}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          Quality score{" "}
                          <span className="font-medium text-foreground">
                            {version.qualityScore}%
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant={isActive ? "secondary" : "outline"}
                          disabled={isActive}
                          onClick={() => {
                            onRestore(version.id);
                            onOpenChange(false);
                          }}
                          aria-label={`Restore version ${version.versionNumber}`}
                        >
                          {isActive ? (
                            <>
                              <Check className="h-4 w-4" />
                              Current
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyVersionState />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EmptyVersionState() {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-border bg-muted/25 p-6 text-center">
      <div className="max-w-[280px]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-border bg-background text-muted-foreground">
          <History className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-foreground">
          No versions yet
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Generate a page first. Every generation and refinement will create a
          version that can be restored later.
        </p>
      </div>
    </div>
  );
}