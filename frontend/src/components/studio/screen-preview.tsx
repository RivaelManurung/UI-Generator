"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MoreVertical, Pencil, RefreshCw, Trash2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PREVIEW_IFRAME_SANDBOX_POLICY } from "@/lib/security/preview-sandbox";
import type { DeviceKey } from "@/lib/constants/device-options";
import { kindFromPageType, type LayoutKind } from "@/lib/generation/layout-kind";
import { LivePreviewSkeleton } from "./live-preview-skeleton";

export interface ScreenCard {
  key: string;
  name: string;
  pageType: string;
  /** Rendered preview HTML, or null while this screen is still generating. */
  html: string | null;
  /** Quality score (0-100) of the page's current version, if available. */
  quality?: number;
}

const DEVICE_WIDTH: Record<DeviceKey, number> = {
  desktop1440: 1440,
  desktop1280: 1280,
  tablet768: 768,
  mobile390: 390,
};

interface ScreenPreviewProps {
  screens: ScreenCard[];
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  onRefine?: (key: string) => void;
  /** Per-screen management actions (omit to hide the ⋯ menu). */
  onRename?: (key: string) => void;
  onRegenerate?: (key: string) => void;
  onDelete?: (key: string) => void;
  /** Device width from the studio top bar — this is the single source of truth. */
  device: DeviceKey;
  generating?: boolean;
  completed?: number;
  total?: number;
  /** Layout family inferred from the prompt — drives the live build skeleton. */
  buildKind?: LayoutKind;
}

/**
 * A clean, full-area preview of the selected generated screen. The page is
 * rendered at the chosen device width and scaled to fit the available width
 * (never upscaled past 100%, so mobile shows at its natural size centered).
 * No infinite canvas, no card chrome, no accent border — just the page in a
 * neutral browser-style frame, with a tab strip to switch screens.
 */
export function ScreenPreview({
  screens,
  activeKey,
  onSelect,
  onRefine,
  onRename,
  onRegenerate,
  onDelete,
  device,
  generating,
  completed,
  total,
  buildKind,
}: ScreenPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  // "Fit page" scales the whole page down to fit the stage (no scroll);
  // "Fit width" (default) fills the width and scrolls vertically.
  const [fitPage, setFitPage] = useState(false);
  // Full content height reported by the sandboxed iframe via postMessage — the
  // ONLY safe way to size "fit page", since the sandbox forbids reading it
  // directly (allow-scripts, no allow-same-origin).
  const [contentH, setContentH] = useState(0);

  // Measure the stage so we can fit the page to width without reading the
  // (cross-origin, sandboxed) iframe — avoids any layout read during render.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const active = useMemo(
    () => screens.find((s) => s.key === activeKey) ?? screens[0] ?? null,
    [screens, activeKey],
  );

  // Reset the measured content height whenever the shown screen changes — the
  // new screen reports its own height through the probe below.
  useEffect(() => {
    setContentH(0);
  }, [active?.key]);

  // Receive the content-height probe (only from our own iframe; compared by
  // window reference since the sandboxed frame has an opaque "null" origin).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { __preview?: string; height?: number } | null;
      if (data && data.__preview === "height" && typeof data.height === "number") {
        setContentH(Math.max(0, Math.round(data.height)));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const logicalW = DEVICE_WIDTH[device] ?? 1440;
  // Default: fit to width, never upscale (so a 390px mobile preview stays
  // phone-sized). The iframe is taller than the frame and scrolls inside it.
  let scale = stage.w > 0 ? Math.min(stage.w / logicalW, 1) : 0.6;
  let frameW = Math.round(logicalW * scale);
  let frameH = stage.h > 0 ? Math.round(stage.h) : 600;
  let iframeH = scale > 0 ? Math.round(frameH / scale) : frameH;

  const canFitPage = fitPage && contentH > 0 && stage.w > 0 && stage.h > 0;
  if (canFitPage) {
    // Fit the WHOLE page: scale by whichever of width/height is tighter, never
    // upscaling. The iframe renders at its natural content height so nothing
    // scrolls — the entire page is visible at once.
    scale = Math.min(stage.w / logicalW, stage.h / contentH, 1);
    frameW = Math.round(logicalW * scale);
    frameH = Math.round(contentH * scale);
    iframeH = contentH;
  }

  // Inject a tiny height-reporting probe before </body>. Runs inside the
  // sandbox (allow-scripts) and posts the page height to the parent — it never
  // reads or mutates parent state, so the isolation guarantee is preserved.
  const htmlWithProbe = useMemo(() => {
    if (!active?.html) return active?.html ?? "";
    const probe =
      "<script>(function(){function s(){try{parent.postMessage({__preview:'height'," +
      "height:Math.ceil(document.documentElement.scrollHeight)},'*')}catch(e){}}" +
      "if(window.ResizeObserver){new ResizeObserver(s).observe(document.documentElement)}" +
      "window.addEventListener('load',s);setTimeout(s,60);s()})()<\/script>";
    return active.html.includes("</body>")
      ? active.html.replace("</body>", probe + "</body>")
      : active.html + probe;
  }, [active?.html]);

  return (
    <div className="flex h-full w-full flex-col bg-sky/30">
      {/* Screen switcher + live generation progress */}
      <div className="flex min-h-11 items-center gap-2 overflow-x-auto border-b border-border bg-card/70 px-3 py-1.5">
        {generating ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            {total && total > 0 ? `Generating ${completed ?? 0}/${total}` : "Planning screens…"}
          </span>
        ) : null}

        <div className="flex items-center gap-1.5">
          {screens.map((screen) => {
            const isActive = screen.key === active?.key;
            const pending = screen.html === null;
            return (
              <button
                key={screen.key}
                type="button"
                onClick={() => onSelect?.(screen.key)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {pending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
                <span className="max-w-[160px] truncate">{screen.name || screen.pageType}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {active && active.html !== null ? (
            <div
              role="group"
              aria-label="Preview fit mode"
              className="flex items-center rounded-md bg-muted p-0.5 text-[10px] font-bold"
            >
              <button
                type="button"
                onClick={() => setFitPage(false)}
                aria-pressed={!fitPage}
                aria-label="Fit to width"
                className={cn(
                  "rounded px-1.5 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !fitPage ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Width
              </button>
              <button
                type="button"
                onClick={() => setFitPage(true)}
                aria-pressed={fitPage}
                aria-label="Fit whole page"
                className={cn(
                  "rounded px-1.5 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  fitPage ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Page
              </button>
            </div>
          ) : null}
          {active && typeof active.quality === "number" && active.quality > 0 ? (
            <span
              title={`Quality score ${Math.round(active.quality)}`}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground"
            >
              Q{Math.round(active.quality)}
            </span>
          ) : null}
          {active && active.html !== null && onRefine ? (
            <button
              type="button"
              onClick={() => onRefine(active.key)}
              aria-label={`Refine ${active.name}`}
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Wrench className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}

          {active && active.html !== null && (onRename || onRegenerate || onDelete) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Manage ${active.name}`}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreVertical className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onRename ? (
                  <DropdownMenuItem onSelect={() => onRename(active.key)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Rename screen
                  </DropdownMenuItem>
                ) : null}
                {onRegenerate ? (
                  <DropdownMenuItem onSelect={() => onRegenerate(active.key)}>
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Regenerate screen
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDelete(active.key)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete screen
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* Full-area preview stage */}
      <div ref={stageRef} className="relative grid flex-1 place-items-center overflow-hidden p-4">
        {!active ? null : active.html === null ? (
          <div
            className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
            style={{ width: frameW || undefined, height: frameH }}
          >
            <LivePreviewSkeleton
              kind={kindFromPageType(active.pageType) ?? buildKind ?? "dashboard"}
              screenName={active.name}
              pageType={active.pageType}
              total={total ?? 0}
              width={logicalW}
              height={iframeH}
              scale={scale}
            />
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
            style={{ width: frameW || undefined, height: frameH }}
          >
            <iframe
              ref={iframeRef}
              sandbox={PREVIEW_IFRAME_SANDBOX_POLICY}
              srcDoc={htmlWithProbe}
              title={`Preview of ${active.name}`}
              scrolling={canFitPage ? "no" : "yes"}
              style={{
                width: logicalW,
                height: iframeH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
