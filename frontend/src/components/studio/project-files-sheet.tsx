"use client";

import { Folder, FileCode2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { GeneratedFile } from "@/types/generation";

interface ProjectFilesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  files: GeneratedFile[];
  onSelectFile: (path: string) => void;
}

export function ProjectFilesSheet({
  open,
  onOpenChange,
  projectName,
  files,
  onSelectFile,
}: ProjectFilesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-planetary/15 bg-sky/40 text-planetary">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-galaxy">
                Project Files
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs leading-5">
                Inspect generated file assets compiled for{" "}
                <strong className="text-foreground">{projectName}</strong>.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 grid gap-2">
          {files.map((file) => (
            <button
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-planetary/30 hover:bg-sky/20"
              key={file.path}
              onClick={() => {
                onSelectFile(file.path);
              }}
              type="button"
              aria-label={`Open generated file ${file.path}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileCode2 className="h-4 w-4 shrink-0 text-planetary" />
                <span className="max-w-[200px] truncate text-xs font-semibold text-galaxy">{file.path}</span>
              </span>

              <Badge variant="outline" className="shrink-0 border-planetary/20 font-mono text-[9px] uppercase text-planetary">
                {file.language}
              </Badge>
            </button>
          ))}

          {files.length === 0 && (
            <div className="rounded-xl border border-dashed border-planetary/20 bg-sky/15 p-6 text-center">
              <Folder className="mx-auto h-8 w-8 text-planetary" />
              <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">
                No generated layout files exist. Run compilation first.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
