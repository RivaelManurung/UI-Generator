"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

import { renderPreview } from "@/lib/generation/preview-compiler";
import { designSystemBySlug, type DesignSystem } from "@/lib/generation/design-systems";
import { PREVIEW_IFRAME_SANDBOX_POLICY } from "@/lib/security/preview-sandbox";
import { generationService } from "@/lib/services/generation-service";
import type { PageSchema } from "@/types/generation";

/**
 * Renders a small live preview of a project's first generated page (reuses the
 * studio's renderPreview). Lazily fetches the project's pages on mount; shows a
 * placeholder while loading or when the project has no generated output yet.
 */
export function ProjectPreviewThumb({
  projectId,
  brand,
  themeSlug,
  designSystems,
}: {
  projectId: string;
  brand: string;
  themeSlug: string;
  designSystems: DesignSystem[];
}) {
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    generationService
      .getProjectPages(projectId)
      .then((pages) => {
        if (cancelled) return;
        const withSchema =
          pages.find((p) => p.schema && Array.isArray(p.schema.sections) && p.schema.sections.length > 0) ??
          pages[0];
        setSchema(withSchema?.schema ?? null);
      })
      .catch(() => {
        if (!cancelled) setSchema(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const html = useMemo(() => {
    if (!schema) return "";
    return renderPreview(schema, {
      brand: brand || "DashboardCraft",
      designSystem: designSystemBySlug(designSystems, themeSlug),
    });
  }, [schema, brand, themeSlug, designSystems]);

  return (
    <div className="relative h-40 w-full overflow-hidden border-b border-border bg-white">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading preview" />
        </div>
      ) : schema ? (
        <iframe
          sandbox={PREVIEW_IFRAME_SANDBOX_POLICY}
          srcDoc={html}
          title="Project preview"
          tabIndex={-1}
          loading="lazy"
          style={{
            width: 1180,
            height: 820,
            transform: "scale(0.55)",
            transformOrigin: "top left",
            pointerEvents: "none",
            border: 0,
          }}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="text-xs font-medium">No preview yet</span>
        </div>
      )}
    </div>
  );
}
