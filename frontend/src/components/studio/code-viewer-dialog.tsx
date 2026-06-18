"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  FileCode2,
  Files,
  FolderTree,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GeneratedFile } from "@/types/generation";

const DynamicCodeEditor = dynamic(
  () => import("./code-editor"),
  {
    ssr: false,
    loading: () => <CodeEditorSkeleton />,
  },
);

interface CodeViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: GeneratedFile[];
  activePath: string;
  onActivePathChange: (path: string) => void;
}

export function CodeViewerDialog({
  open,
  onOpenChange,
  files,
  activePath,
  onActivePathChange,
}: CodeViewerDialogProps) {
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");

  const activeFile = files.find((file) => file.path === activePath) ?? files[0];

  const filteredFiles = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return files;

    return files.filter((file) => file.path.toLowerCase().includes(keyword));
  }, [files, query]);

  const totalLines = useMemo(() => {
    if (!activeFile?.content) return 0;

    return activeFile.content.split("\n").length;
  }, [activeFile]);

  async function handleCopy() {
    if (!activeFile) return;

    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(760px,calc(100vh-3rem))] w-full sm:max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
                <Code2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Generated code
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5">
                  Inspect generated files, switch between outputs, and copy source
                  code.
                </DialogDescription>
              </div>
            </div>

            <div className="mr-8 flex shrink-0 items-center gap-2">
              {activeFile ? (
                <>
                  <Badge variant="outline" className="hidden font-mono md:inline-flex">
                    {activeFile.language}
                  </Badge>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        aria-label="Copy active file content"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy active file</TooltipContent>
                  </Tooltip>
                </>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-border bg-muted/30">
            <div className="border-b border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project files
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {files.length} file{files.length === 1 ? "" : "s"} generated
                  </p>
                </div>

                <Badge variant="secondary" className="shrink-0">
                  TSX
                </Badge>
              </div>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search files..."
                  className="h-9 pl-9"
                  aria-label="Search generated files"
                />
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="p-2">
                {filteredFiles.length > 0 ? (
                  <div className="grid gap-1">
                    {filteredFiles.map((file) => {
                      const isActive = activeFile?.path === file.path;

                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => onActivePathChange(file.path)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background hover:text-foreground",
                          )}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <span
                            className={cn(
                              "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                              isActive
                                ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
                                : "border-border bg-card text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <FileCode2 className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {getFileName(file.path)}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-xs",
                                isActive
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {getDirectoryName(file.path)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <FileSearchEmptyState query={query} />
                )}
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-w-0 flex-col bg-background">
            <div className="flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-4">
              {activeFile ? (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate font-mono text-sm font-medium">
                      {activeFile.path}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <Badge variant="outline" className="font-mono">
                      {totalLines} lines
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {formatBytes(activeFile.content.length)}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Files className="h-4 w-4" />
                  No active file
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-code-editor-bg">
              {activeFile ? (
                <DynamicCodeEditor
                  language={activeFile.language}
                  value={activeFile.content}
                />
              ) : (
                <NoFilesState />
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CodeEditorSkeleton() {
  return (
    <div className="flex h-full min-h-[640px] flex-col gap-4 bg-code-editor-bg p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-muted/20" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-48 bg-muted/20" />
          <Skeleton className="h-3 w-72 bg-muted/10" />
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
        <Skeleton className="h-3 w-10/12 bg-muted/20" />
        <Skeleton className="h-3 w-8/12 bg-muted/20" />
        <Skeleton className="h-3 w-9/12 bg-muted/20" />
        <Skeleton className="h-3 w-7/12 bg-muted/20" />
        <Skeleton className="h-3 w-10/12 bg-muted/20" />
        <Skeleton className="h-3 w-6/12 bg-muted/20" />
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
        <Skeleton className="h-3 w-9/12 bg-muted/20" />
        <Skeleton className="h-3 w-5/12 bg-muted/20" />
        <Skeleton className="h-3 w-8/12 bg-muted/20" />
      </div>
    </div>
  );
}

function NoFilesState() {
  return (
    <div className="grid h-full min-h-[640px] place-items-center bg-background">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
          <FolderTree className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-foreground">
          No generated files
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Generate a page first. Generated files will appear here for inspection
          and export.
        </p>
      </div>
    </div>
  );
}

function FileSearchEmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>

      <p className="mt-3 text-sm font-semibold text-foreground">
        No files found
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        No generated file matches{" "}
        <span className="font-medium text-foreground">“{query}”</span>.
      </p>
    </div>
  );
}

function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

function getDirectoryName(path: string) {
  const parts = path.split("/");

  if (parts.length <= 1) return "root";

  return parts.slice(0, -1).join("/");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  return `${(kb / 1024).toFixed(1)} MB`;
}