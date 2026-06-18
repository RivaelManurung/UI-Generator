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
          <SheetTitle>Project Files</SheetTitle>
          <SheetDescription className="text-xs">
            Inspect generated file assets compiled for <strong>{projectName}</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-2">
          {files.map((file) => (
            <button
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted/50 w-full"
              key={file.path}
              onClick={() => {
                onSelectFile(file.path);
              }}
              type="button"
              aria-label={`Open generated file ${file.path}`}
            >
              <span className="flex items-center gap-3">
                <FileCode2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold truncate max-w-[200px]">{file.path}</span>
              </span>

              <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                {file.language}
              </Badge>
            </button>
          ))}

          {files.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs font-semibold text-muted-foreground leading-5">
                No generated layout files exist. Run compilation first.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
