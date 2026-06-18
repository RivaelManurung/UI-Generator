"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus, Maximize, Wrench, Monitor, Tablet, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PREVIEW_IFRAME_SANDBOX_POLICY } from "@/lib/security/preview-sandbox";

export interface ScreenCard {
  key: string;
  name: string;
  pageType: string;
  /** Rendered preview HTML, or null while this screen is still generating. */
  html: string | null;
  /** Quality score (0-100) of the page's current version, if available. */
  quality?: number;
}

interface ScreensCanvasProps {
  screens: ScreenCard[];
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  /** Refine a specific screen (its sections) — contextual edit from the canvas. */
  onRefine?: (key: string) => void;
}

// Logical viewport each screen renders at, then scaled into a fixed-size card.
const LOGICAL_W = 1180;
const LOGICAL_H = 820;
const CARD_W = 520;
const SCALE = CARD_W / LOGICAL_W;
const BODY_H = Math.round(LOGICAL_H * SCALE);
const HEADER_H = 38;
const CARD_H = BODY_H + HEADER_H;
const GAP = 80;
const GRID = 20; // snap step when dropping a card

// Per-card device frames: each renders the preview at a device logical width so
// the responsive layout reflows, then scales it into a device-sized card.
const DEVICES = {
  desktop: { lw: 1180, lh: 820, cw: 520, Icon: Monitor },
  tablet: { lw: 834, lh: 1040, cw: 430, Icon: Tablet },
  mobile: { lw: 390, lh: 760, cw: 250, Icon: Smartphone },
} as const;
type DeviceKey = keyof typeof DEVICES;
const DEVICE_KEYS = Object.keys(DEVICES) as DeviceKey[];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type View = { x: number; y: number; scale: number };
type Pos = { x: number; y: number };

// A Figma/Stitch-like infinite canvas: pan by dragging the background, zoom with
// the scroll wheel (toward the cursor) or the +/− controls, and drag each screen
// card to reposition it. Zooming scales the whole world transform, so all screens
// stay laid out together instead of each card breaking.
export function ScreensCanvas({ screens, activeKey, onSelect, onRefine }: ScreensCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 60, y: 60, scale: 0.8 });
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const posRef = useRef(positions);
  posRef.current = positions;
  const [isPanning, setIsPanning] = useState(false);
  const [deviceByKey, setDeviceByKey] = useState<Record<string, DeviceKey>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Auto-place any screen that doesn't have a position yet, in a horizontal row.
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      let slot = Object.keys(prev).length;
      for (const s of screens) {
        if (!next[s.key]) {
          next[s.key] = { x: slot * (CARD_W + GAP), y: 0 };
          slot += 1;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [screens]);

  const startPan = useCallback(
    (e: React.PointerEvent) => {
      // Only pan when the gesture starts on the empty canvas, not on a card.
      if (e.button !== 0) return;
      setSelected(new Set()); // clicking empty canvas clears multi-selection
      const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      setIsPanning(true);
      const move = (ev: PointerEvent) =>
        setView((v) => ({ ...v, x: start.vx + (ev.clientX - start.x), y: start.vy + (ev.clientY - start.y) }));
      const up = () => {
        setIsPanning(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [view.x, view.y],
  );

  const startCardDrag = useCallback(
    (e: React.PointerEvent, key: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      // Shift/⌘-click toggles multi-selection without starting a drag.
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        setSelected((s) => {
          const next = new Set(s);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
        return;
      }

      // Plain click: focus this screen. Keep the current multi-selection if the
      // card is already part of it (so you can drag the whole group).
      onSelect?.(key);
      const group = selectedRef.current.has(key) && selectedRef.current.size > 1
        ? Array.from(selectedRef.current)
        : [key];
      if (!selectedRef.current.has(key)) setSelected(new Set([key]));

      const scale = view.scale;
      const starts: Record<string, Pos> = {};
      for (const k of group) starts[k] = posRef.current[k] ?? { x: 0, y: 0 };
      const ox = e.clientX;
      const oy = e.clientY;
      const move = (ev: PointerEvent) => {
        const dx = (ev.clientX - ox) / scale;
        const dy = (ev.clientY - oy) / scale;
        setPositions((p) => {
          const next = { ...p };
          for (const k of group) next[k] = { x: starts[k].x + dx, y: starts[k].y + dy };
          return next;
        });
      };
      const up = () => {
        // Snap every dragged card to the grid on drop (Figma-like).
        setPositions((p) => {
          const next = { ...p };
          for (const k of group) {
            const cur = next[k];
            if (cur) next[k] = { x: Math.round(cur.x / GRID) * GRID, y: Math.round(cur.y / GRID) * GRID };
          }
          return next;
        });
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [view.scale, onSelect],
  );

  // Align / distribute the multi-selection.
  const alignSelected = useCallback((mode: "left" | "top" | "distribute-h") => {
    const keys = Array.from(selectedRef.current);
    if (keys.length < 2) return;
    setPositions((p) => {
      const next = { ...p };
      const xs = keys.map((k) => next[k]?.x ?? 0);
      const ys = keys.map((k) => next[k]?.y ?? 0);
      if (mode === "left") {
        const minX = Math.min(...xs);
        for (const k of keys) if (next[k]) next[k] = { ...next[k], x: minX };
      } else if (mode === "top") {
        const minY = Math.min(...ys);
        for (const k of keys) if (next[k]) next[k] = { ...next[k], y: minY };
      } else {
        const ordered = [...keys].sort((a, b) => (next[a]?.x ?? 0) - (next[b]?.x ?? 0));
        const minX = Math.min(...xs);
        const step = CARD_W + GAP;
        ordered.forEach((k, i) => {
          if (next[k]) next[k] = { ...next[k], x: minX + i * step };
        });
      }
      return next;
    });
  }, []);

  // Clicking empty canvas clears the multi-selection (in addition to panning).
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Native non-passive wheel listener so preventDefault actually stops the page
  // from scrolling — React's onWheel is passive and would ignore preventDefault.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const ns = clamp(v.scale * factor, 0.2, 2.5);
        const wx = (cx - v.x) / v.scale;
        const wy = (cy - v.y) / v.scale;
        return { scale: ns, x: cx - wx * ns, y: cy - wy * ns };
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = (rect?.width ?? 800) / 2;
    const cy = (rect?.height ?? 600) / 2;
    setView((v) => {
      const ns = clamp(v.scale * factor, 0.2, 2.5);
      const wx = (cx - v.x) / v.scale;
      const wy = (cy - v.y) / v.scale;
      return { scale: ns, x: cx - wx * ns, y: cy - wy * ns };
    });
  }, []);

  const fitToScreen = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect?.width ?? 800;
    const vh = rect?.height ?? 600;
    const pos = posRef.current;
    const keys = Object.keys(pos);
    if (keys.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of keys) {
      minX = Math.min(minX, pos[k].x);
      minY = Math.min(minY, pos[k].y);
      maxX = Math.max(maxX, pos[k].x + CARD_W);
      maxY = Math.max(maxY, pos[k].y + CARD_H);
    }
    const contentW = maxX - minX || CARD_W;
    const contentH = maxY - minY || CARD_H;
    const scale = clamp(Math.min(vw / (contentW + 120), vh / (contentH + 120)), 0.2, 1.4);
    setView({
      scale,
      x: (vw - contentW * scale) / 2 - minX * scale,
      y: (vh - contentH * scale) / 2 - minY * scale,
    });
  }, []);

  // Auto-fit once when all screens have finished generating (or on first load with
  // existing screens), so the freshly generated app is framed nicely. Re-fits only
  // when the screen count changes — never fights the user's manual pan/zoom.
  const fittedCountRef = useRef(0);
  useEffect(() => {
    const ready = screens.length > 0 && screens.every((s) => s.html !== null);
    if (ready && screens.length !== fittedCountRef.current) {
      fittedCountRef.current = screens.length;
      const id = setTimeout(fitToScreen, 60);
      return () => clearTimeout(id);
    }
    if (screens.length === 0) fittedCountRef.current = 0;
  }, [screens, fitToScreen]);

  return (
    <div
      ref={viewportRef}
      onPointerDown={startPan}
      role="application"
      aria-label="Screens canvas — drag to pan, scroll to zoom, drag a card to move it"
      className="relative h-full w-full overflow-hidden bg-muted/30 select-none"
      style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* dotted grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />

      {/* world layer */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {screens.map((screen, i) => {
          const pos = positions[screen.key] ?? { x: i * (CARD_W + GAP), y: 0 };
          const isActive = activeKey === screen.key;
          const isSelected = selected.has(screen.key);
          const generating = screen.html === null;
          const dev = deviceByKey[screen.key] ?? "desktop";
          const d = DEVICES[dev];
          const cardScale = d.cw / d.lw;
          const bodyH = Math.round(d.lh * cardScale);
          return (
            <div
              key={screen.key}
              className="absolute"
              style={{ left: pos.x, top: pos.y, width: d.cw }}
              onPointerDown={(e) => startCardDrag(e, screen.key)}
            >
              <div
                className={`flex items-center justify-between gap-2 rounded-t-xl border border-b-0 px-3 py-2 ${
                  isActive ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
                style={{ height: HEADER_H, cursor: "grab" }}
              >
                <span className="truncate text-xs font-bold text-foreground">
                  {screen.name || `Screen ${i + 1}`}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!generating && (
                    <div className="flex items-center rounded-md border border-border" onPointerDown={(e) => e.stopPropagation()}>
                      {DEVICE_KEYS.map((dk) => {
                        const DIcon = DEVICES[dk].Icon;
                        return (
                          <button
                            key={dk}
                            type="button"
                            title={`${dk} view`}
                            aria-label={`${dk} view`}
                            aria-pressed={dev === dk}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeviceByKey((m) => ({ ...m, [screen.key]: dk }));
                            }}
                            className={`grid h-5 w-5 place-items-center rounded ${
                              dev === dk ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <DIcon className="h-3 w-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!generating && typeof screen.quality === "number" && screen.quality > 0 && (
                    <span
                      title={`Quality score ${screen.quality}`}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground"
                    >
                      Q{Math.round(screen.quality)}
                    </span>
                  )}
                  <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                    {screen.pageType}
                  </Badge>
                  {!generating && onRefine && (
                    <button
                      type="button"
                      title="Refine a section of this screen"
                      aria-label={`Refine ${screen.name}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefine(screen.key);
                      }}
                      className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div
                className={`overflow-hidden rounded-b-xl border bg-background ${
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : isActive
                      ? "border-primary ring-1 ring-ring"
                      : "border-border"
                }`}
                style={{ width: d.cw, height: generating ? BODY_H : bodyH }}
              >
                {generating ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/40">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Generating screen…</span>
                  </div>
                ) : (
                  <iframe
                    className="border-0 bg-background"
                    sandbox={PREVIEW_IFRAME_SANDBOX_POLICY}
                    srcDoc={screen.html ?? ""}
                    loading="lazy"
                    title={`Preview of ${screen.name}`}
                    // pointer-events none so dragging/panning works over the card.
                    style={{
                      width: d.lw,
                      height: d.lh,
                      transform: `scale(${cardScale})`,
                      transformOrigin: "top left",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* align toolbar (multi-select) */}
      {selected.size >= 2 && (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1 text-xs font-semibold shadow-lg">
          <span className="px-1 text-muted-foreground">{selected.size} selected</span>
          <button type="button" onClick={() => alignSelected("left")} className="rounded-md px-2 py-1 hover:bg-muted" aria-label="Align left">Align left</button>
          <button type="button" onClick={() => alignSelected("top")} className="rounded-md px-2 py-1 hover:bg-muted" aria-label="Align top">Align top</button>
          <button type="button" onClick={() => alignSelected("distribute-h")} className="rounded-md px-2 py-1 hover:bg-muted" aria-label="Distribute horizontally">Distribute</button>
        </div>
      )}

      {/* mini-map overview */}
      {screens.length > 1 &&
        (() => {
          const keys = screens.map((s) => s.key);
          const pts = keys.map((k) => positions[k]).filter(Boolean) as Pos[];
          if (pts.length === 0) return null;
          const minX = Math.min(...pts.map((p) => p.x));
          const minY = Math.min(...pts.map((p) => p.y));
          const maxX = Math.max(...pts.map((p) => p.x + CARD_W));
          const maxY = Math.max(...pts.map((p) => p.y + CARD_H));
          const rect = viewportRef.current?.getBoundingClientRect();
          const vw = rect?.width ?? 800;
          const vh = rect?.height ?? 600;
          // include the current viewport in the bounds so its marker stays visible
          const vx0 = -view.x / view.scale;
          const vy0 = -view.y / view.scale;
          const bx0 = Math.min(minX, vx0);
          const by0 = Math.min(minY, vy0);
          const bx1 = Math.max(maxX, vx0 + vw / view.scale);
          const by1 = Math.max(maxY, vy0 + vh / view.scale);
          const MW = 168;
          const MH = 116;
          const pad = 6;
          const s = Math.min((MW - pad * 2) / (bx1 - bx0 || 1), (MH - pad * 2) / (by1 - by0 || 1));
          const mx = (x: number) => pad + (x - bx0) * s;
          const my = (y: number) => pad + (y - by0) * s;
          return (
            <div
              className="absolute bottom-4 left-4 z-10 overflow-hidden rounded-lg border border-border bg-card/90 shadow-lg backdrop-blur"
              style={{ width: MW, height: MH }}
              aria-hidden="true"
            >
              {keys.map((k) => {
                const p = positions[k];
                if (!p) return null;
                return (
                  <div
                    key={k}
                    className={`absolute rounded-sm ${selected.has(k) || k === activeKey ? "bg-primary" : "bg-muted-foreground/50"}`}
                    style={{ left: mx(p.x), top: my(p.y), width: Math.max(3, CARD_W * s), height: Math.max(3, CARD_H * s) }}
                  />
                );
              })}
              <div
                className="absolute rounded-sm border border-primary"
                style={{ left: mx(vx0), top: my(vy0), width: (vw / view.scale) * s, height: (vh / view.scale) * s }}
              />
            </div>
          );
        })()}

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-lg">
        <button type="button" onClick={() => zoomBy(1 / 1.2)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-bold tabular-nums text-foreground">
          {Math.round(view.scale * 100)}%
        </span>
        <button type="button" onClick={() => zoomBy(1.2)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" onClick={fitToScreen} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fit screens to view">
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
