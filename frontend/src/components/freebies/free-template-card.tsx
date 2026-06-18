"use client";

import { useMemo } from "react";
import { Download, Eye, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renderPreview } from "@/lib/generation/preview-compiler";
import { designSystemBySlug, type DesignSystem } from "@/lib/generation/design-systems";
import { PREVIEW_IFRAME_SANDBOX_POLICY } from "@/lib/security/preview-sandbox";
import type { FreeTemplate } from "@/types/free-template";

export function FreeTemplateCard({
  template,
  designSystems,
  onOpen,
}: {
  template: FreeTemplate;
  designSystems: DesignSystem[];
  onOpen: (slug: string) => void;
}) {
  const html = useMemo(() => {
    const ds = designSystemBySlug(designSystems, template.designSystemSlug);
    return renderPreview(template.schema, { brand: template.brand || "DashboardCraft", designSystem: ds });
  }, [template.schema, template.brand, template.designSystemSlug, designSystems]);

  return (
    <Card className="group flex flex-col overflow-hidden border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <button
        type="button"
        onClick={() => onOpen(template.slug)}
        aria-label={`Preview ${template.title}`}
        className="relative block h-48 w-full overflow-hidden border-b border-border bg-white"
      >
        <iframe
          sandbox={PREVIEW_IFRAME_SANDBOX_POLICY}
          srcDoc={html}
          title={`Preview of ${template.title}`}
          tabIndex={-1}
          loading="lazy"
          style={{
            width: 1180,
            height: 820,
            transform: "scale(0.46)",
            transformOrigin: "top left",
            pointerEvents: "none",
            border: 0,
          }}
        />
        <span className="absolute inset-0 grid place-items-center bg-galaxy/0 opacity-0 transition group-hover:bg-galaxy/30 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-galaxy shadow">
            <Eye className="size-3.5" /> Preview &amp; copy code
          </span>
        </span>
      </button>

      <CardHeader className="gap-0 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="capitalize">
            {template.category || template.pageType}
          </Badge>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
            <Download className="size-3" />
            {template.downloads}
          </span>
        </div>
        <CardTitle className="mt-3 text-lg leading-tight">{template.title}</CardTitle>
        <CardDescription className="mt-1.5 line-clamp-2 min-h-10">{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="mt-auto flex items-center justify-between gap-2 p-4 pt-0">
        <span className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
          <Layers3 className="size-4" />
          {template.pageType}
        </span>
        <Button size="sm" onClick={() => onOpen(template.slug)}>
          <Eye className="size-4" />
          Get code
        </Button>
      </CardContent>
    </Card>
  );
}
