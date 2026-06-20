"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { DesignSystem } from "@/lib/generation/design-systems";

interface ThemePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systems: DesignSystem[];
  selectedThemeSlug: string;
  onSelectTheme: (slug: string) => void;
  /** Only show themes offered for this target (mobile projects get mobile themes). */
  platform?: "web" | "mobile";
}

// A miniature, token-driven preview so each design system looks like itself in
// the picker (neobrutalism = chunky border + hard shadow, soft = rounded, …).
function Thumbnail({ ds }: { ds: DesignSystem }) {
  const t = ds.tokens;
  const surface =
    t.bg && t.bg !== "transparent"
      ? t.bg
      : t["content-bg"] && t["content-bg"] !== "transparent"
        ? t["content-bg"]
        : "linear-gradient(135deg,#5b7cff,#9a6bff,#ff8fce)";
  return (
    <div
      className="h-16 w-full overflow-hidden rounded-xl p-2"
      style={{ background: surface, fontFamily: t.font }}
    >
      <div
        className="flex h-full flex-col justify-between p-1.5"
        style={{
          background: t.card,
          border: `${t["border-width"] ?? "1px"} solid ${t.border ?? "#e4e4e7"}`,
          borderRadius: t.radius,
          boxShadow: t.shadow,
        }}
      >
        <div
          style={{
            height: 6,
            width: "60%",
            borderRadius: 999,
            background: t.fg,
            opacity: 0.85,
          }}
        />
        <div className="flex gap-1">
          <span style={{ height: 10, width: 18, borderRadius: 4, background: t.primary }} />
          <span style={{ height: 10, width: 12, borderRadius: 4, background: t.accent }} />
        </div>
      </div>
    </div>
  );
}

export function ThemePickerSheet({
  open,
  onOpenChange,
  systems,
  selectedThemeSlug,
  onSelectTheme,
  platform = "web",
}: ThemePickerSheetProps) {
  // A theme is shown when it declares this platform (or declares none = both).
  const visible = systems.filter(
    (ds) => !ds.platforms || ds.platforms.length === 0 || ds.platforms.includes(platform),
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-t border-border sm:max-w-none sm:rounded-t-2xl sm:border-l-0" side="bottom">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold text-galaxy">
            Choose {platform === "mobile" ? "Mobile App" : "Website"} Theme
          </SheetTitle>
          <SheetDescription className="text-xs leading-5">
            Pick the visual style for the generated project. It changes both the live preview and the exported code.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto pb-4 pr-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {visible.map((ds) => {
            const isActive = selectedThemeSlug === ds.slug;
            const isDisabled = ds.status === "soon";

            return (
              <button
                className={`relative w-full rounded-xl border bg-card p-3 text-left text-card-foreground transition-colors ${
                  isActive
                    ? "border-planetary ring-2 ring-planetary/40 ring-offset-2 ring-offset-background"
                    : "border-border"
                } ${
                  isDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-planetary/30 hover:bg-sky/20"
                }`}
                disabled={isDisabled}
                key={ds.slug}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectTheme(ds.slug);
                    onOpenChange(false);
                  }
                }}
                type="button"
                aria-label={`Select design system ${ds.name}`}
                title={ds.description}
              >
                <Thumbnail ds={ds} />
                <p className="mt-2 truncate text-xs font-bold text-galaxy">{ds.name}</p>

                {isActive && (
                  <Badge className="absolute right-2 top-2 h-4 border-transparent bg-primary px-1 text-[8px] text-primary-foreground">
                    Active
                  </Badge>
                )}

                {isDisabled && (
                  <p className="mt-1 text-[9px] font-bold text-muted-foreground">Coming soon</p>
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
