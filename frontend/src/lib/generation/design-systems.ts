import { http } from "@/lib/api/http";

// A DesignSystem is a selectable visual style (shadcn, neobrutalism, doodle,
// glass, soft, …). The canonical source of truth is the backend
// (internal/designsystem/systems.json) served at GET /design-systems; both the
// live preview AND the exported code consume the same tokens, so they cannot drift.
export interface DesignSystem {
  slug: string;
  name: string;
  library?: string;
  status?: string;
  description?: string;
  fontUrl?: string;
  /** Extra raw CSS appended after the skeleton for structural quirks. */
  css?: string;
  /** Flat CSS custom-property values keyed WITHOUT the leading "--". */
  tokens: Record<string, string>;
  /** Platforms this style is offered for ("web"/"mobile"). Empty = both. */
  platforms?: string[];
}

// Bundled fallback so the preview renders a sane neutral look before the API
// responds (or if it fails). Mirrors the "shadcn" entry in the backend catalog.
export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  slug: "shadcn",
  name: "shadcn/ui",
  platforms: ["web", "mobile"],
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap",
  css: "",
  tokens: {
    font: "Geist,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    radius: "8px",
    "border-width": "1px",
    "heading-weight": "700",
    "heading-transform": "none",
    bg: "#ffffff",
    "content-bg": "#fafafa",
    fg: "#09090b",
    card: "#ffffff",
    border: "#e4e4e7",
    muted: "#f4f4f5",
    "muted-fg": "#71717a",
    primary: "#18181b",
    "primary-fg": "#fafafa",
    accent: "#f4f4f5",
    "accent-fg": "#18181b",
    shadow: "0 1px 2px 0 rgba(0,0,0,.05)",
    "sidebar-bg": "#fafafa",
    "sidebar-fg": "#52525b",
    "sidebar-border": "#e4e4e7",
    "sidebar-active-bg": "#f4f4f5",
    "sidebar-active-fg": "#18181b",
    "sidebar-muted": "#a1a1aa",
    "sidebar-title": "#18181b",
    "brand-bg": "#18181b",
    "brand-fg": "#fafafa",
    "topbar-bg": "#ffffff",
    "topbar-fg": "#09090b",
    "topbar-border": "#e4e4e7",
    "chart-1": "#18181b",
    "chart-2": "#a1a1aa",
    "chart-3": "#d4d4d8",
    "chart-4": "#e4e4e7",
    "chart-fill": "rgba(24,24,27,.08)",
    "chart-radius": "6px",
    "badge-ok-bg": "#dcfce7",
    "badge-ok-fg": "#15803d",
    "badge-warn-bg": "#fef3c7",
    "badge-warn-fg": "#b45309",
    "badge-bad-bg": "#fee2e2",
    "badge-bad-fg": "#b91c1c",
    "trend-up": "#16a34a",
    "trend-down": "#dc2626",
  },
};

let cache: DesignSystem[] | null = null;
let inflight: Promise<DesignSystem[]> | null = null;

/** Fetch the design-system catalog once and cache it for the session. */
export async function fetchDesignSystems(): Promise<DesignSystem[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = http
    .get<{ designSystems: DesignSystem[] }>("/design-systems")
    .then((data) => {
      cache = data.designSystems?.length ? data.designSystems : [DEFAULT_DESIGN_SYSTEM];
      return cache;
    })
    .catch(() => {
      cache = [DEFAULT_DESIGN_SYSTEM];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Look up a design system by slug from the cached catalog, with a default. */
export function designSystemBySlug(
  systems: DesignSystem[] | null | undefined,
  slug: string | undefined,
): DesignSystem {
  const list = systems?.length ? systems : [DEFAULT_DESIGN_SYSTEM];
  return list.find((d) => d.slug === slug) ?? list[0] ?? DEFAULT_DESIGN_SYSTEM;
}

/** Render a token map as a CSS custom-property block for ":root{ … }". */
export function rootVars(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `--${k}:${v};`)
    .join("");
}

