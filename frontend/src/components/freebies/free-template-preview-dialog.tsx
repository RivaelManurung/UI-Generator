"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { renderPreview } from "@/lib/generation/preview-compiler";
import { designSystemBySlug, type DesignSystem } from "@/lib/generation/design-systems";
import { PREVIEW_IFRAME_SANDBOX_POLICY } from "@/lib/security/preview-sandbox";
import { freeTemplateService } from "@/lib/services/free-template-service";
import type { FreeTemplateDetail } from "@/types/free-template";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FreeTemplatePreviewDialog({
  slug,
  open,
  onOpenChange,
  designSystems,
}: {
  slug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designSystems: DesignSystem[];
}) {
  const [detail, setDetail] = useState<FreeTemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !slug) {
      setDetail(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    freeTemplateService
      .getBySlug(slug)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        /* dialog shows nothing on error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  const html = useMemo(() => {
    if (!detail) return "";
    const ds = designSystemBySlug(designSystems, detail.designSystemSlug);
    return renderPreview(detail.schema, { brand: detail.brand || "DashboardCraft", designSystem: ds });
  }, [detail, designSystems]);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200);
  }

  function handleDownload(kind: "html" | "tsx") {
    if (!detail) return;
    if (kind === "html") downloadFile(`${detail.slug}.html`, html, "text/html");
    else downloadFile(`${detail.slug}.tsx`, detail.generatedCode, "text/plain");
    freeTemplateService.incrementDownload(detail.slug).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{detail?.title ?? "Free template"}</DialogTitle>
          <DialogDescription>
            {detail?.description || "Preview, then copy or download the code — free to use."}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading template" />
          </div>
        ) : (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="tsx">TSX</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3">
              <div className="h-[60vh] w-full overflow-hidden rounded-xl border border-border bg-white">
                <iframe
                  sandbox={PREVIEW_IFRAME_SANDBOX_POLICY}
                  srcDoc={html}
                  title={`Preview of ${detail.title}`}
                  className="h-full w-full border-0"
                />
              </div>
            </TabsContent>

            <TabsContent value="html" className="mt-3">
              <CodeBlock
                code={html}
                copied={copied === "html"}
                onCopy={() => copy("html", html)}
                onDownload={() => handleDownload("html")}
              />
            </TabsContent>

            <TabsContent value="tsx" className="mt-3">
              <CodeBlock
                code={detail.generatedCode}
                copied={copied === "tsx"}
                onCopy={() => copy("tsx", detail.generatedCode)}
                onDownload={() => handleDownload("tsx")}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CodeBlock({
  code,
  copied,
  onCopy,
  onDownload,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={onCopy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={onDownload}>
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
      <pre className="max-h-[60vh] overflow-auto rounded-xl bg-galaxy p-4 text-xs leading-5 text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}
