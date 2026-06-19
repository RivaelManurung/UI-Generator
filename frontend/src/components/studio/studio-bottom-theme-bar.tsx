"use client";

import type { DesignSystem } from "@/lib/generation/design-systems";

interface StudioBottomThemeBarProps {
  selectedTheme: DesignSystem;
  onOpenThemePicker: () => void;
}

export function StudioBottomThemeBar({
  selectedTheme,
  onOpenThemePicker,
}: StudioBottomThemeBarProps) {
  const t = selectedTheme.tokens;
  const swatch =
    t.bg && t.bg !== "transparent"
      ? t.primary
      : "linear-gradient(135deg, var(--planetary), var(--universe), var(--galaxy))";
  return (
    <button
      className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-xl transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpenThemePicker}
      type="button"
      aria-label={`Open design system picker. Currently selected: ${selectedTheme.name}`}
    >
      <div
        className="h-8 w-8 rounded-full border border-border shadow-sm"
        style={{ background: swatch }}
      />

      <div className="min-w-[100px] text-left">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Active Style</p>
        <p className="mt-0.5 text-xs font-bold text-card-foreground">{selectedTheme.name}</p>
      </div>
    </button>
  );
}
