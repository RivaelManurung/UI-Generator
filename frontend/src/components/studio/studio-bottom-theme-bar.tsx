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
      : "linear-gradient(135deg,#5b7cff,#9a6bff,#ff8fce)";
  return (
    <button
      className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-xl hover:bg-muted/40 transition-colors"
      onClick={onOpenThemePicker}
      type="button"
      aria-label={`Open design system picker. Currently selected: ${selectedTheme.name}`}
    >
      <div
        className="h-8 w-8 rounded-full border border-border"
        style={{ background: swatch }}
      />

      <div className="text-left min-w-[100px]">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active Style</p>
        <p className="text-xs font-bold text-card-foreground mt-0.5">{selectedTheme.name}</p>
      </div>
    </button>
  );
}
