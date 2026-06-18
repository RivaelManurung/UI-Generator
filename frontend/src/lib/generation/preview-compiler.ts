import { PageSchema, SchemaSection } from "@/types/generation";
import { escapeHtml } from "@/lib/security/escape-html";
import { DesignSystem, DEFAULT_DESIGN_SYSTEM, rootVars } from "./design-systems";

const esc = (value: unknown): string => escapeHtml(String(value ?? ""));

/* ------------------------------------------------------------------ icons */
// Lucide-style inline SVG icons so generated UIs use real iconography instead of
// a plain "■". Keyed by name; the model is told these names, and we also resolve
// common business words (revenue→dollar, orders→cart, …) to the closest icon.
const ICON_PATHS: Record<string, string> = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  "credit-card": '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  "trending-down": '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  bar: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  line: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
  truck: '<path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h11v12"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  tag: '<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
};

const ICON_ALIASES: { re: RegExp; name: string }[] = [
  { re: /revenue|sales|income|profit|growth|conversion|rate|roi|margin/, name: "trending-up" },
  { re: /order|purchase|checkout|cart|basket/, name: "cart" },
  { re: /product|sku|stock|inventory|item|package|shipment/, name: "box" },
  { re: /user|customer|patient|student|member|people|staff|team|lead|visitor/, name: "users" },
  { re: /money|payment|invoice|balance|cost|price|cash|fee|spend|wallet/, name: "dollar" },
  { re: /card|transaction/, name: "credit-card" },
  { re: /appointment|schedule|date|event|booking|calendar/, name: "calendar" },
  { re: /time|duration|fulfil|delivery|eta|hour|pending|wait/, name: "clock" },
  { re: /alert|warn|risk|low|out of stock|overdue|error/, name: "alert" },
  { re: /notification|message|inbox|email|mail/, name: "mail" },
  { re: /report|document|file|invoice|export/, name: "file" },
  { re: /chart|analytic|metric|stat|trend/, name: "bar" },
  { re: /security|secure|shield|compliance/, name: "shield" },
  { re: /ship|truck|logistic|warehouse|transit/, name: "truck" },
  { re: /store|shop|retail|building|branch|office/, name: "building" },
  { re: /rating|review|star|favorite/, name: "star" },
  { re: /view|impression|traffic|visit/, name: "eye" },
  { re: /target|goal|objective|kpi/, name: "target" },
  { re: /global|region|country|world|web|site/, name: "globe" },
  { re: /speed|fast|energy|power|instant/, name: "zap" },
];

function resolveIconName(raw?: string): string {
  const key = (raw ?? "").trim().toLowerCase();
  if (key && ICON_PATHS[key]) return key;
  for (const a of ICON_ALIASES) if (a.re.test(key)) return a.name;
  return "activity";
}

function icon(name?: string, cls = "ic"): string {
  const paths = ICON_PATHS[resolveIconName(name)];
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/* ----------------------------------------------------------------- visuals */
// NO default/stock images — generated UIs use CSS initials avatars and branded
// gradient "media" tiles (see avatarBox / abstractVisual below) so nothing ever
// renders a random stock photo.
function hashNum(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 100000;
  return h;
}

// No default/stock images. Avatars are CSS initials; "media" (hero/gallery) is a
// deterministic branded gradient + a content icon — intentional, never random.
function initials(name: string): string {
  const parts = (name || "U").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const s = parts.map((p) => p[0]).join("").toUpperCase();
  return esc(s || "U");
}
function avatarBox(name: string, cls: string): string {
  return `<span class="${cls} av-initials" aria-hidden="true">${initials(name)}</span>`;
}
function abstractVisual(seed: string, iconName: string, cls: string): string {
  const h = hashNum(seed || "media");
  return `<div class="${cls} media-visual" style="--mv-h:${h % 360}deg"><span class="media-ico">${icon(iconName)}</span></div>`;
}

export interface PreviewNavItem {
  label: string;
  active?: boolean;
}

export interface PreviewOptions {
  /** Sidebar navigation entries — typically one per generated page in the project. */
  nav?: PreviewNavItem[];
  /** Brand / workspace name shown at the top of the sidebar. */
  brand?: string;
  /** Legacy theme slug; kept for back-compat. Prefer passing `designSystem`. */
  theme?: string;
  /**
   * The visual design system to render. Its `tokens` drive every color/shape in
   * the preview. When omitted, falls back to the bundled shadcn default.
   */
  designSystem?: DesignSystem;
}

// The preview is an isolated srcDoc iframe — parent @font-face does NOT cross
// into it — so the design system's signature font must be loaded explicitly or
// the look is lost to the OS default sans-serif.
function fontLinkTag(href?: string): string {
  if (!href) return "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="${href}" rel="stylesheet" />`;
}

const SUBTITLE: Record<string, string> = {
  dashboard: "Key metrics and recent activity",
  list: "Browse, filter and manage records",
  form: "Fill in the details below",
  detail: "Full record details",
  analytics: "Trends, filters and downloadable reports",
  login: "Sign in to continue",
};

/* --------------------------------------------------------------- chart svg */
// Charts are DATA-DRIVEN. They read real numbers from the schema (series/data),
// else infer them from a numeric table column or stat values, and only fall back
// to a deterministic-but-varied curve (seeded by the title) so two charts are
// never the identical wave. Every chart has axes, value labels and a gradient.

function parseNum(value: unknown): number {
  const m = String(value ?? "").replace(/[, ]/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

function fmtNum(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n * 100) / 100);
}

// Deterministic-but-varied fallback curve seeded by a label.
function seededCurve(seed: string, n: number): number[] {
  const h = hashNum(seed || "chart");
  const phase = (h % 17) / 2.2;
  const drift = (((h >> 3) % 9) - 4) / (Math.max(n, 2) * 5);
  const amp = 0.24 + (h % 5) * 0.045;
  return Array.from({ length: Math.max(n, 2) }, (_, i) =>
    Math.max(8, Math.round((0.5 + drift * i + Math.sin((i + 1 + phase) * 0.92) * amp) * 1000)),
  );
}

interface ChartData {
  series: number[][];
  names: string[];
  categories: string[];
}

function chartData(section: SchemaSection, fallbackPoints = 9): ChartData {
  let series: number[][] = [];
  let names: string[] = [];

  const raw = section.series;
  if (Array.isArray(raw) && raw.length) {
    if (Array.isArray(raw[0])) {
      series = (raw as number[][]).map((r) => r.map(parseNum).filter(Number.isFinite));
    } else if (raw[0] && typeof raw[0] === "object") {
      const objs = raw as { name?: string; data?: number[] }[];
      series = objs.map((o) => (o.data ?? []).map(parseNum).filter(Number.isFinite));
      names = objs.map((o) => o.name ?? "");
    } else {
      series = [(raw as number[]).map(parseNum).filter(Number.isFinite)];
    }
  } else if (Array.isArray(section.data) && section.data.length) {
    series = [section.data.map(parseNum).filter(Number.isFinite)];
  }
  series = series.filter((s) => s.length);

  // Infer from a numeric table column.
  if (!series.length && section.rows?.length) {
    const width = section.columns?.length ?? section.rows[0]?.length ?? 0;
    for (let c = 0; c < width; c++) {
      const nums = section.rows.map((r) => parseNum(r[c]));
      if (nums.filter(Number.isFinite).length >= Math.min(3, section.rows.length)) {
        series = [nums.map((n) => (Number.isFinite(n) ? n : 0))];
        break;
      }
    }
  }
  // Infer from stat values.
  if (!series.length && section.items?.length) {
    const nums = section.items.map((it) => parseNum(it.value));
    if (nums.filter(Number.isFinite).length >= 2) series = [nums.map((n) => (Number.isFinite(n) ? n : 0))];
  }

  let categories = section.categories ?? [];
  if (!categories.length && section.items?.length && series[0] && section.items.length === series[0].length) {
    categories = section.items.map((it) => it.label);
  }

  if (!series.length) series = [seededCurve(section.title ?? "chart", fallbackPoints)];
  return { series, names, categories };
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const CH_W = 640;
const CH_H = 240;
const CH = { l: 46, r: 16, t: 18, b: 30 };

function xTicks(categories: string[], n: number, x: (i: number) => number): string {
  if (!categories.length) return "";
  const step = Math.max(1, Math.ceil(n / 6));
  return categories
    .slice(0, n)
    .map((c, i) =>
      i % step === 0
        ? `<text x="${x(i).toFixed(1)}" y="${CH_H - 9}" class="ch-xtick" text-anchor="middle">${esc(String(c).slice(0, 7))}</text>`
        : "",
    )
    .join("");
}

function yGrid(minV: number, maxV: number, y: (v: number) => number): string {
  const ticks = 4;
  const span = maxV - minV || 1;
  return Array.from({ length: ticks + 1 }, (_, t) => {
    const v = minV + (span * t) / ticks;
    const gy = y(v).toFixed(1);
    return `<line x1="${CH.l}" y1="${gy}" x2="${CH_W - CH.r}" y2="${gy}" class="ch-grid"/><text x="${CH.l - 8}" y="${gy}" class="ch-ytick" text-anchor="end" dominant-baseline="middle">${fmtNum(v)}</text>`;
  }).join("");
}

// Catmull-Rom → cubic bezier so the line reads as a smooth, polished curve.
function smoothLine(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const t = 0.16;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function lineChartSvg(d: ChartData, area: boolean): string {
  const iw = CH_W - CH.l - CH.r;
  const ih = CH_H - CH.t - CH.b;
  const all = d.series.flat();
  const maxV = Math.max(1, ...all);
  const minV = Math.min(0, ...all);
  const span = maxV - minV || 1;
  const n = Math.max(...d.series.map((s) => s.length), 2);
  const x = (i: number) => CH.l + (i * iw) / (n - 1);
  const y = (v: number) => CH.t + ih - ((v - minV) / span) * ih;
  const grad = `<defs><linearGradient id="chFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.26"/><stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0"/></linearGradient></defs>`;
  const single = d.series.length === 1;
  const paths = d.series
    .map((s, si) => {
      const pts = s.map((v, i) => [x(i), y(v)] as const);
      const line = smoothLine(pts);
      const stroke = CHART_COLORS[si % CHART_COLORS.length];
      const fill =
        area && single
          ? `<path d="${line} L ${x(s.length - 1).toFixed(1)} ${(CH.t + ih).toFixed(1)} L ${CH.l.toFixed(1)} ${(CH.t + ih).toFixed(1)} Z" fill="url(#chFill)"/>`
          : "";
      const last = s[s.length - 1];
      const endDot = `<circle cx="${x(s.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3.6" fill="${stroke}"/>`;
      const lbl = single
        ? `<text x="${(x(s.length - 1) - 6).toFixed(1)}" y="${(y(last) - 9).toFixed(1)}" class="ch-vlabel" text-anchor="end">${fmtNum(last)}</text>`
        : "";
      // Per-point transparent hover targets drive the tooltip.
      const hover = pts
        .map(
          (p, i) =>
            `<circle class="ch-dot" data-v="${fmtNum(s[i])}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="8"/>`,
        )
        .join("");
      return `${fill}<path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${endDot}${lbl}${hover}`;
    })
    .join("");
  return `<svg viewBox="0 0 ${CH_W} ${CH_H}" class="chart-svg" role="img" aria-label="line chart">${grad}${yGrid(minV, maxV, y)}${xTicks(d.categories, n, x)}${paths}</svg>`;
}

function barChartSvg(d: ChartData): string {
  const s = (d.series[0] ?? []).slice(0, 12);
  const iw = CH_W - CH.l - CH.r;
  const ih = CH_H - CH.t - CH.b;
  const maxV = Math.max(1, ...s);
  const minV = Math.min(0, ...s);
  const span = maxV - minV || 1;
  const y = (v: number) => CH.t + ih - ((v - minV) / span) * ih;
  const gap = 12;
  const bw = (iw - gap * (s.length - 1)) / Math.max(s.length, 1);
  const base = CH.t + ih;
  const bars = s
    .map((v, i) => {
      const bx = CH.l + i * (bw + gap);
      const by = y(v);
      const h = base - by;
      const fill = i === s.length - 1 ? "var(--chart-1)" : "var(--chart-2)";
      const lbl =
        s.length <= 9
          ? `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" class="ch-vlabel" text-anchor="middle">${fmtNum(v)}</text>`
          : "";
      return `<rect class="ch-bar" data-v="${fmtNum(v)}" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="6" fill="${fill}" opacity="${i === s.length - 1 ? 1 : 0.82}"/>${lbl}`;
    })
    .join("");
  const xc = (i: number) => CH.l + i * (bw + gap) + bw / 2;
  return `<svg viewBox="0 0 ${CH_W} ${CH_H}" class="chart-svg" role="img" aria-label="bar chart">${yGrid(minV, maxV, y)}${xTicks(d.categories, s.length, xc)}${bars}</svg>`;
}

function stackedBarSvg(d: ChartData): string {
  const groups = Math.max(...d.series.map((s) => s.length), 1);
  const iw = CH_W - CH.l - CH.r;
  const ih = CH_H - CH.t - CH.b;
  const totals = Array.from({ length: groups }, (_, g) => d.series.reduce((a, s) => a + (s[g] ?? 0), 0));
  const maxV = Math.max(1, ...totals);
  const y = (v: number) => CH.t + ih - (v / maxV) * ih;
  const gap = 16;
  const bw = (iw - gap * (groups - 1)) / Math.max(groups, 1);
  const base = CH.t + ih;
  const bars = Array.from({ length: groups }, (_, g) => {
    const bx = CH.l + g * (bw + gap);
    let yTop = base;
    return d.series
      .map((s, si) => {
        const v = s[g] ?? 0;
        const h = (v / maxV) * ih;
        yTop -= h;
        return `<rect x="${bx.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${CHART_COLORS[si % CHART_COLORS.length]}" rx="3"/>`;
      })
      .join("");
  }).join("");
  const xc = (i: number) => CH.l + i * (bw + gap) + bw / 2;
  return `<svg viewBox="0 0 ${CH_W} ${CH_H}" class="chart-svg" role="img" aria-label="stacked bar chart">${yGrid(0, maxV, y)}${xTicks(d.categories, groups, xc)}${bars}</svg>`;
}

function pieChartSvg(d: ChartData): string {
  const vals = (d.series[0] ?? []).slice(0, 6).map((v) => Math.abs(v));
  const labels = d.categories.length ? d.categories : vals.map((_, i) => `Item ${i + 1}`);
  const total = vals.reduce((a, v) => a + v, 0) || 1;
  const R = 78;
  const sw = 28;
  const circ = 2 * Math.PI * R;
  let acc = 0;
  const rings = vals
    .map((v, i) => {
      const frac = v / total;
      const dash = frac * circ;
      const el = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${CHART_COLORS[i % CHART_COLORS.length]}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-acc * circ).toFixed(2)}" transform="rotate(-90 100 100)"/>`;
      acc += frac;
      return el;
    })
    .join("");
  const center = `<text x="100" y="94" class="pie-total" text-anchor="middle">${fmtNum(total)}</text><text x="100" y="114" class="pie-total-sub" text-anchor="middle">Total</text>`;
  const legend = vals
    .map(
      (v, i) =>
        `<span class="legend"><i style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></i><span class="legend-label">${esc(String(labels[i] ?? "").slice(0, 18))}</span><b>${Math.round((v / total) * 100)}%</b></span>`,
    )
    .join("");
  return `<div class="pie-wrap"><svg viewBox="0 0 200 200" class="pie-svg" role="img" aria-label="donut chart">${rings}${center}</svg><div class="legend-list">${legend}</div></div>`;
}

function renderChartPanel(section: SchemaSection): string {
  const type = (section.chartType ?? "bar").toLowerCase();
  const d = chartData(section);
  const multi = d.series.length >= 2;
  const body =
    type.includes("pie") || type.includes("donut")
      ? pieChartSvg(d)
      : type.includes("stack")
        ? multi
          ? stackedBarSvg(d)
          : barChartSvg(d)
        : type.includes("multi")
          ? lineChartSvg(d, !multi)
          : type.includes("line") || type.includes("area")
            ? lineChartSvg(d, true)
            : barChartSvg(d);
  const legendNames = multi && d.names.some(Boolean)
    ? `<div class="ch-legend">${d.names
        .map((nm, i) => (nm ? `<span class="legend"><i style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></i>${esc(nm)}</span>` : ""))
        .join("")}</div>`
    : "";
  return `
    <section class="block card">
      <div class="card-head-row">
        <h2 class="block-title">${esc(section.title ?? "Chart")}</h2>
        ${section.chartType ? `<span class="pill">${esc(section.chartType)}</span>` : ""}
      </div>
      <div class="chart">${body}</div>
      ${legendNames}
      ${section.datasetPreset ? `<p class="muted">Dataset: ${esc(section.datasetPreset)}</p>` : ""}
    </section>`;
}

/* ----------------------------------------------------------- status badges */
const STATUS_RULES: { re: RegExp; cls: string }[] = [
  { re: /(done|complete|completed|selesai|paid|lunas|active|aktif|success|approved|disetujui|in ?stock|tersedia|delivered|terkirim|online)/i, cls: "badge-ok" },
  { re: /(pending|processing|diproses|review|menunggu|waiting|on ?hold|draft|low ?stock|hampir habis|shipped|dikirim|scheduled)/i, cls: "badge-warn" },
  { re: /(failed|cancel|cancelled|dibatalkan|rejected|ditolak|error|out ?of ?stock|habis|overdue|expired|inactive|nonaktif|gagal|offline)/i, cls: "badge-bad" },
];
function statusClass(value: string): string {
  for (const r of STATUS_RULES) if (r.re.test(value)) return r.cls;
  return "";
}

function trendHtml(trend?: string): string {
  if (!trend) return "";
  const t = trend.trim();
  const down = /^[-−]|down|turun|▼|▾|loss|−/i.test(t);
  return `<span class="stat-trend ${down ? "trend-down" : "trend-up"}">${down ? "▾" : "▴"} ${esc(t)}</span>`;
}

// sparklineSvg draws a tiny trend line for a stat card from real data when the
// schema provides `spark`, else a seeded-but-varied series whose slope is forced
// to agree with the card's trend direction (up/down) so it never contradicts it.
function sparklineSvg(seed: string, down: boolean, data?: number[]): string {
  const W = 120;
  const H = 34;
  const P = 2;
  let vals: number[];
  if (data && data.length >= 2) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    vals = data.map((v) => (v - min) / span);
  } else {
    const phase = hashNum(seed) % 7;
    const amp = 0.18 + (hashNum(seed) % 4) * 0.05;
    vals = Array.from({ length: 12 }, (_, i) => {
      const slope = (down ? -1 : 1) * (i / 11) * 0.5;
      return Math.max(0.04, Math.min(0.96, 0.3 + slope + Math.sin((i + 1 + phase) * 0.9) * amp));
    });
  }
  const n = vals.length;
  const pts = vals.map((v, i) => {
    const x = P + (i * (W - 2 * P)) / (n - 1);
    const y = H - P - v * (H - 2 * P);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const stroke = down ? "var(--trend-down)" : "var(--trend-up)";
  const fillId = `sp${hashNum(seed)}`;
  const area = `${line} L ${pts[n - 1][0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.22"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${fillId})"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/* --------------------------------------------------------------- sections */
function renderStatsGrid(section: SchemaSection): string {
  const items = section.items ?? [];
  // The first KPI gets a "primary" hero treatment for scale contrast, so the
  // grid has a clear focal point instead of N identical cards.
  const cards = items
    .map((item, i) => {
      const down = /^[-−]|down|turun|▼|▾|loss/i.test((item.trend ?? "").trim());
      const dataNumeric = parseNum(item.value);
      return `
      <article class="stat-card${i === 0 ? " stat-card--primary" : ""}" data-countup="${Number.isFinite(dataNumeric) ? esc(item.value) : ""}">
        <div class="stat-top">
          <span class="stat-label">${esc(item.label)}</span>
          <span class="stat-ico">${icon(item.icon || item.label)}</span>
        </div>
        <strong class="stat-value">${esc(item.value)}</strong>
        ${trendHtml(item.trend)}
        ${sparklineSvg(item.label || item.value, down, item.spark)}
      </article>`;
    })
    .join("");
  return `
    <section class="block">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="stats-grid">${cards || `<p class="muted">No metrics</p>`}</div>
    </section>`;
}

function renderDataTable(section: SchemaSection): string {
  const columns = section.columns ?? [];
  const rows = section.rows ?? [];
  const statusCol = columns.findIndex((c) => /status|state|kondisi|kondis/i.test(c));
  const head = columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const colSpan = Math.max(columns.length, 1);
  const cellHtml = (cell: string, idx: number): string => {
    const cls = idx === statusCol ? statusClass(cell) || "badge-neutral" : statusClass(cell);
    if (cls && cell.length <= 24) return `<td><span class="badge ${cls}">${esc(cell)}</span></td>`;
    return `<td>${esc(cell)}</td>`;
  };
  const bodyRows =
    rows.length > 0
      ? rows.map((row) => `<tr>${row.map((c, i) => cellHtml(String(c), i)).join("")}</tr>`).join("")
      : `<tr><td class="empty" colspan="${colSpan}">No records to display</td></tr>`;
  return `
    <section class="block card pad0">
      ${section.title ? `<h2 class="block-title table-title">${esc(section.title)}</h2>` : ""}
      <div class="table-wrap">
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </section>`;
}

function renderFilterToolbar(section: SchemaSection): string {
  const chips = (section.filters ?? []).map((f) => `<span class="chip">${esc(f)}</span>`).join("");
  return `
    <section class="block toolbar card">
      <span class="search-wrap"><span class="search-ico">${icon("search")}</span><input class="search" type="text" placeholder="${esc(section.searchPlaceholder ?? "Search")}" aria-label="Search" /></span>
      <div class="chips">${chips}</div>
      ${section.primaryAction ? `<button class="primary">${esc(section.primaryAction)}</button>` : ""}
    </section>`;
}

function renderFormSection(section: SchemaSection): string {
  const fields = (section.fields ?? [])
    .map(
      (field) => `
      <label class="field">
        <span class="field-label">${esc(field.label)}</span>
        <input class="field-input" type="${esc(field.type || "text")}" placeholder="${esc(field.hint ?? "")}" />
        ${field.hint ? `<span class="field-hint">${esc(field.hint)}</span>` : ""}
      </label>`,
    )
    .join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="form-grid">${fields}</div>
      <button class="primary">${esc(section.submitLabel ?? "Submit")}</button>
    </section>`;
}

const GOOGLE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2.04H12v3.86h5.9a5.04 5.04 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.71 3.25-7.88z"/><path fill="#34A853" d="M12 23c2.95 0 5.43-.98 7.24-2.96l-3.54-2.75c-.98.66-2.24 1.05-3.7 1.05-2.85 0-5.26-1.92-6.12-4.5H2.23v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.88 13.84a6.6 6.6 0 0 1 0-4.22V6.78H2.23a11 11 0 0 0 0 9.9l3.65-2.84z"/><path fill="#EA4335" d="M12 5.32c1.6 0 3.05.55 4.18 1.63l3.14-3.14A11 11 0 0 0 12 1 11 11 0 0 0 2.23 6.78l3.65 2.84C6.74 7.24 9.15 5.32 12 5.32z"/></svg>';

// renderAuthForm draws a real, centered SaaS sign-in card (logo, title, email +
// password with show-password toggle, remember me, forgot link, primary CTA, a
// divider and a "Continue with Google" button). Returns just the card; the caller
// supplies the centering/gradient wrapper (.auth-page or .auth-wrap).
function renderAuthForm(section: SchemaSection, brand: string): string {
  const initial = esc((brand.match(/[A-Za-z0-9]/)?.[0] ?? "D").toUpperCase());
  const fields =
    section.fields && section.fields.length
      ? section.fields
      : [
          { label: "Email", type: "email", hint: "you@company.com" },
          { label: "Password", type: "password", hint: "••••••••" },
        ];
  const inputs = fields
    .map((f) => {
      const isPwd = /password/i.test(`${f.type ?? ""} ${f.label ?? ""}`);
      const inner = isPwd
        ? `<span class="af-input-wrap"><input class="af-input" type="password" placeholder="${esc(f.hint ?? "")}" data-pwd /><button type="button" class="af-eye" aria-label="Show password" data-toggle-pwd>${icon("eye")}</button></span>`
        : `<input class="af-input" type="${esc(f.type || "text")}" placeholder="${esc(f.hint ?? "")}" />`;
      return `<label class="af-field"><span class="af-label">${esc(f.label)}</span>${inner}</label>`;
    })
    .join("");
  const links = section.actions ?? [];
  const forgot = esc(links[0] || "Forgot password?");
  return `
    <div class="auth-card">
      <div class="auth-brand"><span class="auth-mark">${initial}</span></div>
      <h1 class="auth-title">${esc(section.title ?? "Welcome back")}</h1>
      ${section.subtitle ? `<p class="auth-sub">${esc(section.subtitle)}</p>` : `<p class="auth-sub">Sign in to continue to your workspace</p>`}
      <form class="auth-form" onsubmit="return false">
        ${inputs}
        <div class="auth-row">
          <label class="af-check"><input type="checkbox" checked /> <span>Remember me</span></label>
          <a class="af-forgot" href="#">${forgot}</a>
        </div>
        <button class="primary af-submit" type="submit">${esc(section.primaryAction ?? section.submitLabel ?? "Sign in")}</button>
      </form>
      <div class="auth-divider"><span>or</span></div>
      <button class="ghost af-google" type="button">${GOOGLE_SVG}<span>Continue with Google</span></button>
      <p class="auth-foot">${links[1] ? esc(links[1]) : `Don't have an account? <a href="#">Sign up</a>`}</p>
    </div>`;
}

function renderActionFooter(section: SchemaSection): string {
  const secondary = (section.actions ?? []).map((a) => `<button class="ghost">${esc(a)}</button>`).join("");
  return `
    <section class="block footer">
      ${secondary}
      ${section.primaryAction ? `<button class="primary">${esc(section.primaryAction)}</button>` : ""}
    </section>`;
}

function renderProfileSummary(section: SchemaSection): string {
  const props = Object.entries(section.properties ?? {})
    .map(
      ([key, value]) =>
        `<div class="prop"><span class="prop-key">${esc(key)}</span><span class="prop-value">${esc(value)}</span></div>`,
    )
    .join("");
  const entityName = (section.entity ?? section.title ?? "Profile").trim();
  return `
    <section class="block card">
      <div class="profile-head">
        ${avatarBox(entityName, "profile-avatar")}
        <div>
          <h2 class="block-title" style="margin:0">${esc(section.entity ?? section.title ?? "Profile")}</h2>
          ${section.title && section.entity ? `<p class="muted">${esc(section.title)}</p>` : ""}
        </div>
      </div>
      <div class="props">${props || `<p class="muted">No details</p>`}</div>
    </section>`;
}

function renderTabbedContent(section: SchemaSection): string {
  const tabs = section.tabs ?? [];
  const headers = tabs
    .map((tab, index) => `<button class="tab ${index === 0 ? "active" : ""}" data-tab="${index}">${esc(tab.label)}</button>`)
    .join("");
  const panels = tabs
    .map(
      (tab, index) =>
        `<ul class="tab-list" data-panel="${index}"${index === 0 ? "" : " hidden"}>${(tab.items ?? [])
          .map((item) => `<li>${esc(item)}</li>`)
          .join("")}</ul>`,
    )
    .join("");
  return `
    <section class="block card tabbed">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="tabs">${headers}</div>
      ${panels}
    </section>`;
}

function renderActivityTimeline(section: SchemaSection): string {
  const items = (section.items ?? [])
    .map(
      (item) => `
      <li class="timeline-item">
        <span class="timeline-dot"></span>
        <div>
          <strong>${esc(item.label)}</strong>
          <span class="muted">${esc(item.value)}</span>
          ${item.trend ? `<span class="timeline-trend">${esc(item.trend)}</span>` : ""}
        </div>
      </li>`,
    )
    .join("");
  return `
    <section class="block card">
      <h2 class="block-title">${esc(section.title ?? "Activity")}</h2>
      <ul class="timeline">${items || `<li class="muted">No activity</li>`}</ul>
    </section>`;
}

function renderNotificationList(section: SchemaSection): string {
  const items = (section.items ?? [])
    .map(
      (item) => `
      <li class="notif-item">
        <span class="notif-dot ${statusClass(`${item.label} ${item.value}`) || ""}"></span>
        <div>
          <strong>${esc(item.label)}</strong>
          ${item.value ? `<span class="muted">${esc(item.value)}</span>` : ""}
        </div>
      </li>`,
    )
    .join("");
  return `
    <section class="block card">
      <h2 class="block-title">${esc(section.title ?? "Notifications")}</h2>
      <ul class="notif-list">${items || `<li class="muted">No notifications</li>`}</ul>
    </section>`;
}

function renderPlaceholder(section: SchemaSection, label: string): string {
  const isEmpty = /empty/i.test(label);
  const heading = section.title ?? label;
  const msg = isEmpty
    ? section.subtitle || "Nothing here yet — items you add will show up in this space."
    : `${label} preview`;
  return `
    <section class="block card placeholder">
      <div class="empty-wrap">
        <span class="empty-ico">${icon(isEmpty ? "box" : section.type || "file")}</span>
        <strong class="empty-title">${esc(heading)}</strong>
        <p class="muted">${esc(msg)}</p>
        ${section.primaryAction ? `<button class="primary">${esc(section.primaryAction)}</button>` : ""}
      </div>
    </section>`;
}

function renderHero(section: SchemaSection): string {
  const actions = [
    section.primaryAction ? `<button class="primary">${esc(section.primaryAction)}</button>` : "",
    ...(section.actions ?? []).map((a) => `<button class="ghost">${esc(a)}</button>`),
  ].join("");
  return `
    <section class="block hero">
      <div class="hero-copy">
        <h1 class="hero-title">${esc(section.title ?? "")}</h1>
        ${section.subtitle ? `<p class="hero-sub">${esc(section.subtitle)}</p>` : ""}
        ${actions ? `<div class="hero-actions">${actions}</div>` : ""}
      </div>
      <div class="hero-media">${abstractVisual(section.image || section.title || "hero", section.title || "activity", "hero-visual")}</div>
    </section>`;
}

function renderGallery(section: SchemaSection): string {
  const cards = (section.items ?? [])
    .map(
      (item) => `
      <figure class="gallery-card">
        ${abstractVisual(item.image || item.label, item.label || "layers", "gallery-visual")}
        <figcaption>
          <strong>${esc(item.label)}</strong>
          ${item.value ? `<span class="muted">${esc(item.value)}</span>` : ""}
        </figcaption>
      </figure>`,
    )
    .join("");
  return `
    <section class="block">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="gallery">${cards}</div>
    </section>`;
}

function renderFeatureGrid(section: SchemaSection): string {
  const cards = (section.items ?? [])
    .map(
      (item) => `
      <article class="feature-card">
        <span class="feature-ico">${icon(item.icon || item.label)}</span>
        <strong class="feature-title">${esc(item.label)}</strong>
        ${item.value ? `<p class="muted">${esc(item.value)}</p>` : ""}
      </article>`,
    )
    .join("");
  return `
    <section class="block">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="feature-grid">${cards}</div>
    </section>`;
}

function renderPricing(section: SchemaSection): string {
  const items = section.items ?? [];
  const cards = items
    .map((item, i) => {
      const featured = /popular|best|recommend|unggulan|terlaris/i.test(item.trend ?? "") || (items.length === 3 && i === 1);
      return `
      <article class="price-card${featured ? " price-featured" : ""}">
        ${item.trend ? `<span class="price-badge">${esc(item.trend)}</span>` : ""}
        <h3 class="price-name">${esc(item.label)}</h3>
        <div class="price-amount">${esc(item.value)}</div>
        <button class="${featured ? "primary" : "ghost"} price-cta">${esc(section.primaryAction ?? "Choose plan")}</button>
      </article>`;
    })
    .join("");
  return `
    <section class="block">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="pricing">${cards}</div>
    </section>`;
}

function renderTestimonials(section: SchemaSection): string {
  const cards = (section.items ?? [])
    .map(
      (item) => `
      <figure class="quote-card">
        <blockquote class="quote-text">${esc(item.value)}</blockquote>
        <figcaption class="quote-by">
          ${avatarBox(item.label || "user", "quote-avatar")}
          <span><strong>${esc(item.label)}</strong>${item.trend ? `<small class="muted">${esc(item.trend)}</small>` : ""}</span>
        </figcaption>
      </figure>`,
    )
    .join("");
  return `
    <section class="block">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="quotes">${cards}</div>
    </section>`;
}

function renderStepper(section: SchemaSection): string {
  const steps = (section.items ?? [])
    .map(
      (item, i) => `
      <li class="step">
        <span class="step-num">${i + 1}</span>
        <div class="step-body">
          <strong>${esc(item.label)}</strong>
          ${item.value ? `<span class="muted">${esc(item.value)}</span>` : ""}
        </div>
      </li>`,
    )
    .join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <ol class="stepper">${steps}</ol>
    </section>`;
}

function pctOf(value: string): number {
  const m = (value ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return Math.max(0, Math.min(100, n));
}

function renderProgressList(section: SchemaSection): string {
  const rows = (section.items ?? [])
    .map(
      (item) => `
      <div class="prog-row">
        <div class="prog-head"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>
        <div class="prog-track"><div class="prog-fill" style="width:${pctOf(item.value)}%"></div></div>
      </div>`,
    )
    .join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="prog-list">${rows}</div>
    </section>`;
}

function renderMapPanel(section: SchemaSection): string {
  const items = section.items ?? [];
  const pins = items
    .slice(0, 6)
    .map((item, i) => {
      const x = 12 + ((i * 37 + 19) % 76);
      const y = 14 + ((i * 53 + 11) % 64);
      return `<span class="map-pin" style="left:${x}%;top:${y}%" title="${esc(item.label)}"></span>`;
    })
    .join("");
  const list = items
    .map(
      (item) => `<li><span class="map-dot"></span><div><strong>${esc(item.label)}</strong>${item.value ? `<span class="muted">${esc(item.value)}</span>` : ""}</div></li>`,
    )
    .join("");
  return `
    <section class="block card map-panel">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="map-body">
        <div class="map-canvas">${pins}</div>
        <ul class="map-list">${list}</ul>
      </div>
    </section>`;
}

function renderKanban(section: SchemaSection): string {
  const cols = section.columns && section.columns.length ? section.columns : ["Backlog", "In Progress", "Done"];
  const items = section.items ?? [];
  const columns = cols
    .map((col, ci) => {
      const cards = items
        .filter((_, idx) => idx % cols.length === ci)
        .map((item) => `<div class="kb-card"><strong>${esc(item.label)}</strong>${item.value ? `<span class="muted">${esc(item.value)}</span>` : ""}</div>`)
        .join("");
      return `<div class="kb-col"><div class="kb-col-head">${esc(col)}</div><div class="kb-cards">${cards || `<div class="kb-card muted">No cards</div>`}</div></div>`;
    })
    .join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="kanban">${columns}</div>
    </section>`;
}

function renderCalendar(section: SchemaSection): string {
  const items = section.items ?? [];
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const head = dows.map((d) => `<div class="cal-dow">${d}</div>`).join("");
  // Map up to 5 events onto deterministic days.
  const eventDay: Record<number, string> = {};
  items.slice(0, 6).forEach((item, i) => {
    eventDay[3 + ((i * 5 + 2) % 24)] = item.label;
  });
  const cells = Array.from({ length: 35 }, (_, i) => {
    const day = i + 1;
    if (day > 31) return `<div class="cal-cell cal-empty"></div>`;
    const ev = eventDay[day];
    return `<div class="cal-cell"><span class="cal-day">${day}</span>${ev ? `<span class="cal-event">${esc(ev)}</span>` : ""}</div>`;
  }).join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="cal-grid">${head}${cells}</div>
    </section>`;
}

// Sensible default width per component when the model omits `span`, so the
// grid still composes nicely instead of collapsing to one column.
const DEFAULT_SPAN: Record<string, number> = {
  hero: 12,
  gallery: 12,
  featureGrid: 12,
  pricingTable: 12,
  testimonials: 12,
  stepper: 8,
  progressList: 4,
  mapPanel: 8,
  kanbanBoard: 12,
  calendarView: 8,
  statsGrid: 12,
  filterToolbar: 12,
  dataTable: 12,
  chartPanel: 8,
  tabbedContent: 8,
  formSection: 6,
  profileSummary: 4,
  activityTimeline: 4,
  notificationList: 4,
  emptyState: 6,
  actionFooter: 12,
};
const SPAN_COLS: Record<string, number> = {
  full: 12,
  "two-thirds": 8,
  half: 6,
  third: 4,
};
function spanCols(section: SchemaSection): number {
  const explicit = SPAN_COLS[(section.span ?? "").toLowerCase()];
  return explicit ?? DEFAULT_SPAN[section.type] ?? 12;
}

function renderSection(section: SchemaSection): string {
  switch (section.type) {
    case "statsGrid":
      return renderStatsGrid(section);
    case "chartPanel":
      return renderChartPanel(section);
    case "dataTable":
      return renderDataTable(section);
    case "filterToolbar":
      return renderFilterToolbar(section);
    case "formSection":
      return renderFormSection(section);
    case "actionFooter":
      return renderActionFooter(section);
    case "profileSummary":
      return renderProfileSummary(section);
    case "tabbedContent":
      return renderTabbedContent(section);
    case "activityTimeline":
      return renderActivityTimeline(section);
    case "emptyState":
      return renderPlaceholder(section, "Empty state");
    case "notificationList":
      return renderNotificationList(section);
    case "hero":
      return renderHero(section);
    case "gallery":
      return renderGallery(section);
    case "featureGrid":
      return renderFeatureGrid(section);
    case "pricingTable":
      return renderPricing(section);
    case "testimonials":
      return renderTestimonials(section);
    case "stepper":
      return renderStepper(section);
    case "progressList":
      return renderProgressList(section);
    case "mapPanel":
      return renderMapPanel(section);
    case "kanbanBoard":
      return renderKanban(section);
    case "calendarView":
      return renderCalendar(section);
    case "authForm":
      return `<div class="auth-wrap">${renderAuthForm(section, "DashboardCraft")}</div>`;
    default:
      return renderPlaceholder(section, section.type || "Section");
  }
}

/* ------------------------------------------------------------------ shell */
function wantsShell(schema: PageSchema): boolean {
  const layout = (schema.layout ?? "").toLowerCase();
  const pageType = (schema.pageType ?? "").toLowerCase();
  if (pageType === "login") return false;
  if (layout.includes("centered") || layout.includes("auth") || layout.includes("blank")) return false;
  return true;
}

type NavEntry = { label: string; icon: string };
// Realistic, domain-aware primary navigation so each generated screen looks like a
// real product (Stitch-style), not a 3-item cross-link of the other generated pages.
const NAV_BY_DOMAIN: Record<string, NavEntry[]> = {
  inventory: [{ label: "Dashboard", icon: "home" }, { label: "Products", icon: "box" }, { label: "Orders", icon: "cart" }, { label: "Suppliers", icon: "truck" }, { label: "Warehouses", icon: "building" }, { label: "Reports", icon: "bar" }],
  finance: [{ label: "Dashboard", icon: "home" }, { label: "Transactions", icon: "credit-card" }, { label: "Invoices", icon: "file" }, { label: "Accounts", icon: "wallet" }, { label: "Budgets", icon: "target" }, { label: "Reports", icon: "bar" }],
  hospital: [{ label: "Dashboard", icon: "home" }, { label: "Patients", icon: "users" }, { label: "Appointments", icon: "calendar" }, { label: "Doctors", icon: "user" }, { label: "Departments", icon: "building" }, { label: "Reports", icon: "bar" }],
  school: [{ label: "Dashboard", icon: "home" }, { label: "Students", icon: "users" }, { label: "Classes", icon: "calendar" }, { label: "Teachers", icon: "user" }, { label: "Grades", icon: "star" }, { label: "Reports", icon: "bar" }],
  ecommerce: [{ label: "Dashboard", icon: "home" }, { label: "Products", icon: "bag" }, { label: "Orders", icon: "cart" }, { label: "Customers", icon: "users" }, { label: "Promotions", icon: "gift" }, { label: "Analytics", icon: "bar" }],
  hr: [{ label: "Dashboard", icon: "home" }, { label: "Employees", icon: "users" }, { label: "Recruiting", icon: "briefcase" }, { label: "Payroll", icon: "wallet" }, { label: "Time off", icon: "calendar" }, { label: "Reports", icon: "bar" }],
  default: [{ label: "Dashboard", icon: "home" }, { label: "Analytics", icon: "bar" }, { label: "Customers", icon: "users" }, { label: "Projects", icon: "layers" }, { label: "Reports", icon: "file" }, { label: "Billing", icon: "credit-card" }],
};
const NAV_SECONDARY: NavEntry[] = [
  { label: "Team", icon: "users" }, { label: "Settings", icon: "settings" }, { label: "Help", icon: "message" },
];

function navForDomain(domain: string): NavEntry[] {
  const d = (domain || "").toLowerCase();
  for (const key of Object.keys(NAV_BY_DOMAIN)) {
    if (key !== "default" && (d.includes(key) || (key === "ecommerce" && /retail|fashion|shop|store|market|commerce/.test(d)) || (key === "hospital" && /medical|clinic|health|dental/.test(d)) || (key === "school" && /education|campus|학|akadem/.test(d)) || (key === "inventory" && /warehouse|stock|logistic/.test(d)))) {
      return NAV_BY_DOMAIN[key];
    }
  }
  return NAV_BY_DOMAIN.default;
}

// Pick which nav item to highlight for this page, by title keyword then page type.
function activeNavIndex(items: NavEntry[], schema: PageSchema): number {
  const title = (schema.title ?? "").toLowerCase();
  const byTitle = items.findIndex((it) => title.includes(it.label.toLowerCase()) || it.label.toLowerCase().includes(title.split(" ")[0] ?? ""));
  if (byTitle >= 0) return byTitle;
  const t = (schema.pageType ?? "").toLowerCase();
  if (t === "dashboard" || t === "analytics") return 0;
  if (t === "list") return 1;
  return Math.min(2, items.length - 1);
}

function brandFor(schema: PageSchema, opts: PreviewOptions): string {
  return schema.brand?.trim() || opts.brand?.trim() || "DashboardCraft";
}

// Nav is PROMPT-DRIVEN: use the model-provided product menu (schema.nav) when it
// gave one, else fall back to the domain default. This is why two different
// briefs no longer share the same canned sidebar.
function navItemsFor(schema: PageSchema): NavEntry[] {
  if (schema.nav && schema.nav.length >= 3) {
    return schema.nav.slice(0, 8).map((label) => ({ label: String(label), icon: String(label) }));
  }
  return navForDomain(schema.domain);
}

// A horizontal top-nav shell, an alternative to the sidebar — chosen by the model
// via layout (e.g. "top-nav") so lighter/portal/marketing products look different
// from data-heavy admin apps.
function wantsTopNav(schema: PageSchema): boolean {
  return /top[-\s]?nav|navbar|horizontal/.test((schema.layout ?? "").toLowerCase());
}

function renderTopNav(schema: PageSchema, opts: PreviewOptions): string {
  const brand = brandFor(schema, opts);
  const items = navItemsFor(schema);
  const activeIdx = activeNavIndex(items, schema);
  const initial = esc((brand.match(/[A-Za-z0-9]/)?.[0] ?? "D").toUpperCase());
  const links = items
    .slice(0, 6)
    .map((it, i) => `<a class="tn-link ${i === activeIdx ? "active" : ""}">${esc(it.label)}</a>`)
    .join("");
  return `
    <header class="tn-bar">
      <div class="tn-brand"><span class="brand-mark">${initial}</span><span class="brand-text">${esc(brand)}</span></div>
      <nav class="tn-nav">${links}</nav>
      <div class="tn-actions"><button class="t-btn" aria-label="Notifications"><span class="t-badge"></span>${icon("bell")}</button>${avatarBox(brand, "t-avatar")}</div>
    </header>`;
}

function renderSidebar(schema: PageSchema, opts: PreviewOptions): string {
  const brand = brandFor(schema, opts);
  const items = navItemsFor(schema);
  const activeIdx = activeNavIndex(items, schema);
  const navLink = (it: NavEntry, active: boolean) =>
    `<a class="nav-item ${active ? "active" : ""}"><span class="nav-ico">${icon(it.icon)}</span><span class="nav-text">${esc(it.label)}</span></a>`;
  const mainLinks = items.map((it, i) => navLink(it, i === activeIdx)).join("");
  const secondary = NAV_SECONDARY.map((it) => navLink(it, false)).join("");
  const initial = esc((brand.match(/[A-Za-z0-9]/)?.[0] ?? "D").toUpperCase());
  return `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">${initial}</span><span class="brand-text">${esc(brand)}</span></div>
      <div class="nav-label">Menu</div>
      ${mainLinks}
      <div class="nav-label">Workspace</div>
      ${secondary}
      <div class="sidebar-foot">
        ${avatarBox("Admin", "avatar")}
        <small><strong>Admin</strong><br/><span class="muted">${esc((schema.domain || "workspace").replace(/^./, (c) => c.toUpperCase()))}</span></small>
      </div>
    </aside>`;
}

// Vanilla runtime INSIDE the sandboxed preview (allow-scripts). Makes the output
// behave like a real app: tab switching, toast notifications, clickable modals
// (table-row detail + create dialogs), form validation with loading states, chart
// hover tooltips, and KPI count-up. It never touches the parent frame.
const PREVIEW_JS = `<script>
(function(){
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toastRoot(){ var r=document.getElementById('ui-toast'); if(!r){ r=document.createElement('div'); r.id='ui-toast'; document.body.appendChild(r); } return r; }
  function showToast(msg, kind){
    var t=document.createElement('div'); t.className='ui-toast-item '+(kind||'');
    t.innerHTML='<span class="ui-toast-dot"></span><span>'+msg+'</span>';
    toastRoot().appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('in'); });
    setTimeout(function(){ t.classList.remove('in'); setTimeout(function(){ t.remove(); },240); }, 2600);
  }
  function closeModal(){ var m=document.getElementById('ui-modal'); if(m){ m.classList.remove('in'); setTimeout(function(){ if(m.parentNode) m.parentNode.removeChild(m); },180); } }
  function openModal(title, body){
    closeModal();
    var m=document.createElement('div'); m.id='ui-modal'; m.className='ui-modal';
    m.innerHTML='<div class="ui-modal-backdrop" data-mclose></div><div class="ui-modal-card" role="dialog" aria-modal="true"><div class="ui-modal-head"><h3>'+title+'</h3><button class="ui-modal-x" data-mclose aria-label="Close">&times;</button></div><div class="ui-modal-body">'+body+'</div></div>';
    document.body.appendChild(m);
    requestAnimationFrame(function(){ m.classList.add('in'); });
  }
  function createForm(){ return '<label class="ui-field"><span>Name</span><input class="ui-minput" placeholder="Enter a name" /></label><label class="ui-field"><span>Owner</span><input class="ui-minput" placeholder="Assign an owner" /></label><div class="ui-modal-actions"><button class="ghost" data-mclose>Cancel</button><button class="primary" data-mcreate>Create</button></div>'; }
  function isEmail(v){ var a=v.indexOf('@'); return a>0 && v.indexOf('.',a)>a+1 && v.indexOf(' ')<0; }
  function validateScope(scope){
    var inputs=scope.querySelectorAll('input'); var ok=true;
    for(var i=0;i<inputs.length;i++){ (function(inp){
      var wrap=inp.closest('label')||inp.parentNode; var old=wrap.querySelector('.ui-err'); if(old) old.remove(); inp.classList.remove('is-invalid');
      if(inp.type==='checkbox') return;
      var v=(inp.value||'').trim(); var msg='';
      if(v==='') msg='This field is required';
      else if(inp.type==='email' && !isEmail(v)) msg='Enter a valid email';
      else if(inp.type==='password' && v.length<6) msg='Use at least 6 characters';
      if(msg){ ok=false; inp.classList.add('is-invalid'); var e=document.createElement('span'); e.className='ui-err'; e.textContent=msg; wrap.appendChild(e); }
    })(inputs[i]); }
    return ok;
  }

  document.addEventListener('click', function(ev){
    var t=ev.target;
    if(t.closest('[data-mcreate]')){ var mm=t.closest('.ui-modal'); var mi=mm&&mm.querySelector('.ui-minput'); if(mi && !mi.value.trim()){ mi.classList.add('is-invalid'); return; } closeModal(); showToast('Created successfully','ok'); return; }
    if(t.closest('[data-mclose]')){ closeModal(); return; }
    var pwd=t.closest('[data-toggle-pwd]'); if(pwd){ var pi=pwd.parentNode.querySelector('[data-pwd]'); if(pi){ pi.type = pi.type==='password'?'text':'password'; pwd.setAttribute('aria-label', pi.type==='password'?'Show password':'Hide password'); } return; }
    var tr=t.closest('.table-wrap tbody tr');
    if(tr && !tr.querySelector('.empty')){
      var table=tr.closest('table'); var heads=table?table.querySelectorAll('thead th'):[]; var cells=tr.querySelectorAll('td'); var body='';
      for(var c=0;c<cells.length;c++){ var h=heads[c]?heads[c].textContent:('Field '+(c+1)); body+='<div class="ui-kv"><span>'+h+'</span><strong>'+cells[c].innerHTML+'</strong></div>'; }
      openModal('Record details', body+'<div class="ui-modal-actions"><button class="primary" data-mclose>Close</button></div>');
      return;
    }
    var btn=t.closest('button, .af-google'); if(!btn || btn.classList.contains('tab') || btn.classList.contains('ui-modal-x')) return;
    var label=(btn.textContent||'').trim();
    if(btn.classList.contains('af-google')){ ev.preventDefault(); showToast('Signing in with Google…'); return; }
    var card=btn.closest('.card, .auth-card, .toolbar');
    var isSubmit=btn.getAttribute('type')==='submit' || btn.classList.contains('af-submit');
    if(card && card.querySelector('input') && (isSubmit || /save|submit|sign in|apply|search/i.test(label))){
      ev.preventDefault(); var scope=btn.closest('form')||card;
      if(!validateScope(scope)){ showToast('Please fix the highlighted fields','bad'); return; }
      var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="ui-spin"></span>Working…';
      setTimeout(function(){ btn.disabled=false; btn.innerHTML=orig; showToast((label||'Saved')+' — success','ok'); }, 850);
      return;
    }
    if(/create|new|add|invite|tambah|buat/i.test(label)){ ev.preventDefault(); openModal(label, createForm()); return; }
    if(btn.classList.contains('primary')||btn.classList.contains('ghost')||btn.classList.contains('t-btn')||btn.classList.contains('price-cta')){ ev.preventDefault(); showToast(label||'Done'); }
  });
  document.addEventListener('keydown', function(ev){ if(ev.key==='Escape') closeModal(); });

  var groups=document.querySelectorAll('.tabbed');
  for(var g=0; g<groups.length; g++){ (function(sec){
    var tabs=sec.querySelectorAll('.tab'); var panels=sec.querySelectorAll('[data-panel]');
    for(var i=0;i<tabs.length;i++){ tabs[i].addEventListener('click', function(){ var idx=this.getAttribute('data-tab'); for(var k=0;k<tabs.length;k++) tabs[k].classList.toggle('active', tabs[k]===this); for(var p=0;p<panels.length;p++) panels[p].hidden=panels[p].getAttribute('data-panel')!==idx; }); }
  })(groups[g]); }

  var tip;
  document.addEventListener('mouseover', function(ev){ var d=ev.target.closest('[data-v]'); if(!d) return; if(!tip){ tip=document.createElement('div'); tip.className='ui-chart-tip'; document.body.appendChild(tip); } tip.textContent=d.getAttribute('data-v'); var r=d.getBoundingClientRect(); tip.style.left=(r.left+r.width/2)+'px'; tip.style.top=(r.top-10)+'px'; tip.classList.add('in'); });
  document.addEventListener('mouseout', function(ev){ if(tip && ev.target.closest('[data-v]')) tip.classList.remove('in'); });

  if(rm) return;
  var ccards=document.querySelectorAll('[data-countup]');
  for(var c=0;c<ccards.length;c++){ (function(card){
    var raw=card.getAttribute('data-countup'); var valEl=card.querySelector('.stat-value'); if(!raw||!valEl) return;
    var i=0; while(i<raw.length && (raw[i]<'0'||raw[i]>'9')) i++;
    var j=raw.length; while(j>i && (raw[j-1]<'0'||raw[j-1]>'9')) j--;
    if(j<=i) return;
    var prefix=raw.slice(0,i), suffix=raw.slice(j), numStr=raw.slice(i,j).replace(/,/g,'');
    var target=parseFloat(numStr); if(!isFinite(target)) return;
    var dotp=numStr.indexOf('.'), dec=dotp>=0?numStr.length-dotp-1:0, dur=900, start=null;
    function fmt(n){ return prefix + (dec===0 ? Math.round(n).toLocaleString('en-US') : n.toFixed(dec)) + suffix; }
    function step(ts){ if(!start)start=ts; var tt=Math.min(1,(ts-start)/dur); valEl.textContent=fmt(target*(1-Math.pow(1-tt,3))); if(tt<1) requestAnimationFrame(step); else valEl.textContent=raw; }
    valEl.textContent=fmt(0); requestAnimationFrame(step);
  })(ccards[c]); }
})();
</script>`;

export function renderPreview(schema: PageSchema, opts: PreviewOptions = {}): string {
  const sections = `<div class="grid">${(schema.sections ?? [])
    .map((s) => `<div class="cell" style="grid-column:span ${spanCols(s)}">${renderSection(s)}</div>`)
    .join("")}</div>`;
  const shell = wantsShell(schema);
  const ds = opts.designSystem ?? DEFAULT_DESIGN_SYSTEM;
  const vars = rootVars(ds.tokens);
  const subtitle = SUBTITLE[(schema.pageType ?? "").toLowerCase()] ?? schema.domain ?? "";

  const head = `
    <header class="page-head">
      <h1>${esc(schema.title)}</h1>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
    </header>`;

  // Login = a centered auth card on a gradient, NOT the admin shell / page-head.
  const authSection =
    (schema.sections ?? []).find((s) => s.type === "authForm") ??
    (schema.sections ?? []).find((s) => s.type === "formSection");
  const isAuthPage =
    !shell &&
    ((schema.pageType ?? "").toLowerCase() === "login" ||
      (schema.sections ?? []).some((s) => s.type === "authForm"));

  const body = shell && wantsTopNav(schema)
    ? `<div class="tn-wrap">
    ${renderTopNav(schema, opts)}
    <main class="tn-page">
      ${head}
      ${sections}
    </main>
  </div>`
    : shell
    ? `<div class="shell">
    ${renderSidebar(schema, opts)}
    <div class="main">
      <div class="topbar">
        <div class="crumb">${esc(schema.title)}<span> · ${esc(schema.domain || "custom")}</span></div>
        <div class="topbar-actions">
          <span class="search-top"><span class="search-top-ico">${icon("search")}</span><input type="text" placeholder="Search…" aria-label="Search" /></span>
          <button class="t-btn" aria-label="Notifications"><span class="t-badge"></span>${icon("bell")}</button>
          ${avatarBox(brandFor(schema, opts), "t-avatar")}
        </div>
      </div>
      <main class="page">
        ${head}
        ${sections}
      </main>
    </div>
  </div>`
    : isAuthPage
      ? `<main class="auth-page">${renderAuthForm(
          authSection ?? { type: "authForm", title: schema.title },
          opts.brand?.trim() || schema.title || "DashboardCraft",
        )}</main>`
      : `<main class="page solo">
    ${head}
    ${sections}
  </main>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${fontLinkTag(ds.fontUrl)}
<style>
*{box-sizing:border-box}
:root{${vars}}
body{margin:0;background:var(--content-bg);color:var(--fg);font-family:var(--font);-webkit-font-smoothing:antialiased}
.shell{display:flex;min-height:100vh}
.sidebar{width:248px;flex-shrink:0;background:var(--sidebar-bg);color:var(--sidebar-fg);border-right:1px solid var(--sidebar-border);padding:18px 14px;display:flex;flex-direction:column;gap:2px}
.brand{display:flex;align-items:center;gap:10px;padding:4px 8px 18px;font-weight:800;font-size:15px;color:var(--sidebar-title)}
.brand-mark{width:30px;height:30px;border-radius:9px;background:var(--brand-bg);color:var(--brand-fg);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.brand-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-label{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--sidebar-muted);font-weight:700;padding:14px 10px 6px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius);color:var(--sidebar-fg);font-size:13px;font-weight:600;cursor:pointer}
.nav-item .nav-ico{display:flex;flex-shrink:0;opacity:.85}
.nav-item .nav-ico .ic{width:17px;height:17px}
.nav-item:not(.active):hover{background:color-mix(in srgb,var(--sidebar-fg) 8%,transparent)}
.nav-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-item.active{background:var(--sidebar-active-bg);color:var(--sidebar-active-fg)}
.nav-item.active .dot{opacity:1}
.sidebar-foot{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px 10px 4px;border-top:1px solid var(--sidebar-border)}
.sidebar-foot .avatar{width:30px;height:30px;border-radius:999px;background:var(--sidebar-active-bg);flex-shrink:0}
.sidebar-foot small{color:var(--sidebar-muted);font-size:11px;line-height:1.3}
.main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--content-bg)}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 28px;border-bottom:1px solid var(--topbar-border);background:var(--topbar-bg);color:var(--topbar-fg);min-width:0}
.topbar .crumb{font-weight:700;font-size:14px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.topbar .crumb span{opacity:.6;font-weight:500}
.topbar-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.search-top{border:1px solid color-mix(in srgb,var(--topbar-fg) 22%,transparent);border-radius:var(--radius);padding:8px 14px;font-size:13px;color:color-mix(in srgb,var(--topbar-fg) 65%,transparent);min-width:200px}
.t-avatar{width:32px;height:32px;border-radius:999px;background:color-mix(in srgb,var(--topbar-fg) 18%,transparent);flex-shrink:0}
.tn-wrap{display:flex;flex-direction:column;min-height:100vh;background:var(--content-bg)}
.tn-bar{display:flex;align-items:center;gap:20px;padding:12px 28px;border-bottom:1px solid var(--topbar-border);background:var(--topbar-bg);color:var(--topbar-fg);position:sticky;top:0;z-index:5}
.tn-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;flex-shrink:0}
.tn-nav{display:flex;align-items:center;gap:4px;flex:1;overflow-x:auto}
.tn-link{padding:8px 14px;border-radius:var(--radius);font-size:14px;font-weight:600;color:color-mix(in srgb,var(--topbar-fg) 70%,transparent);cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.tn-link:hover{background:color-mix(in srgb,var(--topbar-fg) 8%,transparent);color:var(--topbar-fg)}
.tn-link.active{background:var(--primary);color:var(--primary-fg)}
.tn-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.tn-page{padding:28px 32px;display:flex;flex-direction:column;gap:22px;max-width:1280px;margin:0 auto;width:100%}
@media(max-width:760px){.tn-page{padding:18px}.tn-bar{padding:12px 16px;gap:12px}}
.page{padding:28px 32px;display:flex;flex-direction:column;gap:22px}
.page.solo{max-width:1180px;margin:0 auto;width:100%}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:20px;align-items:start;grid-auto-flow:row dense}
.cell{min-width:0}
.cell>.block{margin:0;height:100%}
.cell>.block.card{display:flex;flex-direction:column}
@media(max-width:980px){.grid{grid-template-columns:repeat(6,1fr)}.cell{grid-column:span 6 !important}}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
.page-head h1{margin:0;font-size:24px;font-weight:var(--heading-weight,800);text-transform:var(--heading-transform,none)}
.page-head p{margin:6px 0 0;color:var(--muted-fg);font-weight:500;font-size:14px}
.block-title{margin:0 0 16px;font-size:16px;font-weight:var(--heading-weight,700);text-transform:var(--heading-transform,none)}
.card{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);padding:22px;box-shadow:var(--shadow)}
.chart-svg rect{rx:var(--chart-radius,6px)}
.card.pad0{padding:0;overflow:hidden}
.muted{color:var(--muted-fg);font-size:13px}
.pill{border-radius:999px;background:var(--accent);color:var(--accent-fg);padding:4px 12px;font-size:12px;font-weight:700;text-transform:capitalize}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.stat-card{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);padding:18px 20px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)}
.stat-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.stat-label{font-size:13px;color:var(--muted-fg);font-weight:600}
.stat-ico{width:34px;height:34px;border-radius:9px;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.stat-value{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums}
.stat-trend{font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:3px}
.spark{width:100%;height:30px;margin-top:6px;display:block;opacity:.85}
.trend-up{color:var(--trend-up,#16a34a)}
.trend-down{color:var(--trend-down,#dc2626)}
/* Hero KPI: scale contrast so the grid has a focal point, not N identical cards. */
.stat-card--primary{grid-column:span 2;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 9%,var(--card)),var(--card));border-color:color-mix(in srgb,var(--primary) 22%,var(--border))}
.stat-card--primary .stat-value{font-size:40px;letter-spacing:-.01em}
.stat-card--primary .stat-ico{background:var(--primary);color:var(--primary-fg)}
@media(max-width:760px){.stat-card--primary{grid-column:auto}.stat-card--primary .stat-value{font-size:32px}}
/* Interaction + motion: make it feel like an app, not a screenshot. */
.card,.stat-card,.gallery-card,.feature-card,.kb-card{transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease}
.stat-card:hover,.gallery-card:hover,.feature-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg,0 12px 28px -10px color-mix(in srgb,var(--fg) 22%,transparent))}
.nav-item,.tab,.primary,.ghost,.chip,.field-input,.search,.t-btn{transition:background .15s ease,color .15s ease,box-shadow .15s ease,transform .12s ease,border-color .15s ease}
.primary:hover{filter:brightness(1.06)}
.primary:active,.ghost:active,.t-btn:active{transform:translateY(1px)}
.ghost:hover{background:var(--muted);border-color:color-mix(in srgb,var(--fg) 18%,var(--border))}
a,button{outline:none}
:where(a,button,input,.tab,.nav-item):focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:var(--radius)}
.field-input:focus,.search:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent);color:var(--fg)}
@keyframes blockIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:no-preference){.cell{animation:blockIn .5s cubic-bezier(.16,1,.3,1) both}.cell:nth-child(2){animation-delay:.05s}.cell:nth-child(3){animation-delay:.1s}.cell:nth-child(4){animation-delay:.15s}.cell:nth-child(n+5){animation-delay:.2s}}
/* Live search field + topbar chrome */
.search-wrap{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);padding:0 12px}
.search-wrap:focus-within{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 16%,transparent)}
.search-wrap .search-ico{display:flex;color:var(--muted-fg)}.search-wrap .search-ico .ic{width:16px;height:16px}
.search-wrap .search{flex:1;border:0;background:transparent;box-shadow:none;padding:10px 0;color:var(--fg)}
.search-wrap .search:focus{box-shadow:none}
.search-top{display:flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--topbar-fg) 22%,transparent);border-radius:var(--radius);padding:0 12px;min-width:0;flex:0 1 220px}
.search-top:focus-within{border-color:var(--primary)}
.search-top .search-top-ico{display:flex;color:color-mix(in srgb,var(--topbar-fg) 60%,transparent)}.search-top .search-top-ico .ic{width:15px;height:15px}
.search-top input{border:0;background:transparent;outline:none;padding:9px 0;font-size:13px;color:var(--topbar-fg);width:100%}
.t-btn{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid color-mix(in srgb,var(--topbar-fg) 16%,transparent);border-radius:var(--radius);background:transparent;color:var(--topbar-fg);cursor:pointer}
.t-btn:hover{background:color-mix(in srgb,var(--topbar-fg) 8%,transparent)}
.t-btn .ic{width:17px;height:17px}
.t-badge{position:absolute;top:7px;right:8px;width:7px;height:7px;border-radius:999px;background:var(--trend-down,#dc2626)}
img.t-avatar{object-fit:cover}
img.avatar{object-fit:cover;border:1px solid var(--sidebar-border)}
.sidebar-foot small strong{color:var(--sidebar-title);font-weight:700}
.card-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.card-head-row .block-title{margin:0}
.chart{width:100%}
.chart-svg{width:100%;height:auto;display:block;overflow:visible}
.ch-grid{stroke:var(--border);stroke-width:1;opacity:.55}
.ch-ytick{fill:var(--muted-fg);font-size:11px;font-weight:600}
.ch-xtick{fill:var(--muted-fg);font-size:11px;font-weight:600}
.ch-vlabel{fill:var(--fg);font-size:12px;font-weight:800}
.ch-bar{transition:opacity .12s}.ch-bar:hover{opacity:1}
.ch-dot{fill:transparent;transition:fill .12s}.ch-dot:hover{fill:color-mix(in srgb,var(--chart-1) 24%,transparent)}
.ch-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px}
.pie-wrap{display:flex;align-items:center;gap:32px;flex-wrap:wrap;justify-content:center}
.pie-svg{width:190px;height:190px;flex-shrink:0}
.pie-total{fill:var(--fg);font-size:26px;font-weight:800}
.pie-total-sub{fill:var(--muted-fg);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.legend-list{display:flex;flex-direction:column;gap:10px;min-width:140px}
.legend{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted-fg);font-weight:600}
.legend i{width:12px;height:12px;border-radius:3px;display:inline-block;flex-shrink:0}
.legend .legend-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.legend b{color:var(--fg);font-variant-numeric:tabular-nums}
.table-title{padding:18px 20px 0}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}
thead th{text-align:left;padding:11px 20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--muted-fg);background:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
tbody td{padding:13px 20px;border-bottom:1px solid var(--border)}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--muted)}
td.empty{text-align:center;color:var(--muted-fg);padding:26px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.5;white-space:nowrap}
.badge::before{content:'';width:6px;height:6px;border-radius:999px;background:currentColor}
.badge-ok{background:var(--badge-ok-bg,#dcfce7);color:var(--badge-ok-fg,#15803d)}
.badge-warn{background:var(--badge-warn-bg,#fef3c7);color:var(--badge-warn-fg,#b45309)}
.badge-bad{background:var(--badge-bad-bg,#fee2e2);color:var(--badge-bad-fg,#b91c1c)}
.badge-neutral{background:var(--muted);color:var(--muted-fg)}
.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.search{flex:1;min-width:200px;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);padding:10px 14px;font-size:14px;background:var(--card);color:var(--muted-fg)}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border-radius:999px;background:var(--accent);color:var(--accent-fg);padding:6px 12px;font-size:12px;font-weight:600}
.primary{border:0;border-radius:var(--radius);background:var(--primary);color:var(--primary-fg);padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:var(--shadow)}
.ghost{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);color:var(--fg);padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:18px}
.field{display:flex;flex-direction:column;gap:6px}
.field-label{font-size:13px;font-weight:600}
.field-input{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);padding:10px 12px;font-size:14px;background:var(--card)}
.field-hint{font-size:12px;color:var(--muted-fg)}
.footer{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap}
.profile-head{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.profile-avatar{width:54px;height:54px;border-radius:var(--radius);background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;flex-shrink:0}
.props{display:grid;gap:12px}
.prop{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);padding-bottom:10px}
.prop:last-child{border-bottom:0;padding-bottom:0}
.prop-key{color:var(--muted-fg);font-size:13px;font-weight:600}
.prop-value{font-weight:600;font-size:14px}
.tabs{display:flex;gap:6px;background:var(--muted);border-radius:var(--radius);padding:4px;width:max-content;margin-bottom:14px;flex-wrap:wrap}
.tab{border:0;background:transparent;border-radius:calc(var(--radius) - 2px);padding:8px 18px;font-weight:700;color:var(--muted-fg);cursor:pointer;font-size:13px}
.tab.active{background:var(--card);color:var(--fg);box-shadow:var(--shadow)}
.tab-list{margin:0;padding-left:18px;display:grid;gap:8px}
.timeline{list-style:none;margin:0;padding:0;display:grid;gap:16px}
.timeline-item{display:flex;gap:12px;align-items:flex-start}
.timeline-dot{margin-top:6px;width:10px;height:10px;border-radius:999px;background:var(--primary);flex-shrink:0}
.timeline-item div{display:flex;flex-direction:column;gap:2px}
.timeline-trend{font-size:12px;color:var(--primary);font-weight:700}
.notif-list{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.notif-item{display:flex;gap:12px;align-items:flex-start}
.notif-dot{margin-top:6px;width:9px;height:9px;border-radius:999px;background:var(--primary);flex-shrink:0}
.notif-dot.badge-ok{background:var(--trend-up,#16a34a)}
.notif-dot.badge-warn{background:var(--badge-warn-fg,#d97706)}
.notif-dot.badge-bad{background:var(--trend-down,#dc2626)}
.notif-item div{display:flex;flex-direction:column;gap:2px}
.placeholder{border-style:dashed}
.empty-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:26px 16px}
.empty-ico{width:48px;height:48px;border-radius:14px;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center}
.empty-ico .ic{width:24px;height:24px}
.empty-title{font-size:15px;font-weight:800}
.empty-wrap .primary{margin-top:6px}
/* Auth / login screen */
.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(1100px 560px at 50% -10%,color-mix(in srgb,var(--primary) 16%,var(--content-bg)),var(--content-bg))}
.auth-wrap{display:flex;justify-content:center;padding:8px}
.auth-card{width:100%;max-width:400px;background:var(--card);border:var(--border-width,1px) solid var(--border);border-radius:calc(var(--radius) + 6px);box-shadow:0 24px 60px -20px color-mix(in srgb,var(--fg) 28%,transparent);padding:32px}
.auth-brand{display:flex;justify-content:center;margin-bottom:18px}
.auth-mark{width:48px;height:48px;border-radius:14px;background:var(--primary);color:var(--primary-fg);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
.auth-title{margin:0;text-align:center;font-size:24px;font-weight:800}
.auth-sub{margin:6px 0 22px;text-align:center;color:var(--muted-fg);font-size:14px}
.auth-form{display:grid;gap:14px}
.af-field{display:grid;gap:6px}
.af-label{font-size:13px;font-weight:600}
.af-input-wrap{position:relative;display:flex;align-items:center}
.af-input{width:100%;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);padding:10px 12px;font-size:14px;background:var(--card);color:var(--fg);transition:border-color .15s,box-shadow .15s}
.af-input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent)}
.af-input-wrap .af-input{padding-right:40px}
.af-eye{position:absolute;right:8px;display:grid;place-items:center;width:28px;height:28px;border:0;background:transparent;color:var(--muted-fg);cursor:pointer;border-radius:8px}
.af-eye:hover{background:var(--muted);color:var(--fg)}
.af-eye .ic{width:16px;height:16px}
.auth-row{display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-top:2px}
.af-check{display:flex;align-items:center;gap:7px;color:var(--muted-fg);cursor:pointer}
.af-forgot{color:var(--primary);font-weight:600;text-decoration:none}
.af-forgot:hover{text-decoration:underline}
.af-submit{width:100%;justify-content:center;margin-top:4px;padding:11px}
.auth-divider{display:flex;align-items:center;gap:12px;color:var(--muted-fg);font-size:12px;margin:18px 0}
.auth-divider::before,.auth-divider::after{content:"";height:1px;flex:1;background:var(--border)}
.af-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:11px}
.auth-foot{margin:18px 0 0;text-align:center;font-size:13px;color:var(--muted-fg)}
.auth-foot a{color:var(--primary);font-weight:600;text-decoration:none}
/* No default images: CSS initials avatars + branded gradient media */
.av-initials{display:grid;place-items:center;font-weight:800;color:#fff;overflow:hidden;background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 45%,var(--accent)));flex-shrink:0}
.profile-avatar.av-initials{font-size:20px}
.quote-avatar.av-initials{font-size:14px}
.t-avatar.av-initials{font-size:13px}
.sidebar-foot .avatar.av-initials{font-size:12px}
.media-visual{width:100%;height:100%;display:grid;place-items:center;position:relative;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 92%,#000),color-mix(in srgb,var(--primary) 42%,var(--accent)));filter:hue-rotate(var(--mv-h,0deg))}
.media-visual::before{content:"";position:absolute;inset:0;background-image:radial-gradient(60% 60% at 24% 18%,rgba(255,255,255,.24),transparent 60%),radial-gradient(52% 52% at 86% 84%,rgba(255,255,255,.14),transparent 55%)}
.media-visual::after{content:"";position:absolute;inset:0;background-image:linear-gradient(transparent 94%,rgba(255,255,255,.10) 94%),linear-gradient(90deg,transparent 94%,rgba(255,255,255,.10) 94%);background-size:24px 24px;opacity:.5}
.media-ico{position:relative;color:#fff;opacity:.95}
.media-ico .ic{width:56px;height:56px}
.gallery-card .media-visual{height:150px}
.gallery-card .media-ico .ic{width:38px;height:38px}
/* Interactive runtime: toast, modal, validation, chart tooltip */
#ui-toast{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.ui-toast-item{display:flex;align-items:center;gap:9px;background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:12px;box-shadow:0 14px 34px -10px rgba(0,0,0,.32);padding:11px 15px;font-size:13px;font-weight:600;opacity:0;transform:translateY(8px);transition:opacity .22s,transform .22s;max-width:320px}
.ui-toast-item.in{opacity:1;transform:none}
.ui-toast-dot{width:8px;height:8px;border-radius:999px;background:var(--primary);flex-shrink:0}
.ui-toast-item.ok .ui-toast-dot{background:var(--trend-up,#16a34a)}
.ui-toast-item.bad .ui-toast-dot{background:var(--trend-down,#dc2626)}
.ui-modal{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;padding:20px}
.ui-modal-backdrop{position:absolute;inset:0;background:rgba(8,15,40,.5);opacity:0;transition:opacity .2s;backdrop-filter:blur(2px)}
.ui-modal.in .ui-modal-backdrop{opacity:1}
.ui-modal-card{position:relative;width:100%;max-width:440px;background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:calc(var(--radius) + 6px);box-shadow:0 30px 70px -20px rgba(0,0,0,.5);transform:translateY(10px) scale(.98);opacity:0;transition:transform .2s,opacity .2s;max-height:84vh;overflow:auto}
.ui-modal.in .ui-modal-card{transform:none;opacity:1}
.ui-modal-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border)}
.ui-modal-head h3{margin:0;font-size:16px;font-weight:800}
.ui-modal-x{border:0;background:transparent;font-size:22px;line-height:1;color:var(--muted-fg);cursor:pointer;width:30px;height:30px;border-radius:8px}
.ui-modal-x:hover{background:var(--muted);color:var(--fg)}
.ui-modal-body{padding:18px}
.ui-field{display:block;margin:0 0 12px}
.ui-field>span{font-size:13px;font-weight:600}
.ui-kv{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);font-size:14px}
.ui-kv span{color:var(--muted-fg)}
.ui-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.ui-minput{width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;font-size:14px;background:var(--card);color:var(--fg);margin-top:4px}
.ui-minput:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent)}
.is-invalid{border-color:var(--trend-down,#dc2626) !important;box-shadow:0 0 0 3px color-mix(in srgb,var(--trend-down,#dc2626) 16%,transparent) !important}
.ui-err{display:block;color:var(--trend-down,#dc2626);font-size:12px;font-weight:600;margin-top:5px}
.ui-spin{display:inline-block;width:13px;height:13px;border:2px solid currentColor;border-top-color:transparent;border-radius:999px;margin-right:7px;vertical-align:-1px;animation:uispin .7s linear infinite}
@keyframes uispin{to{transform:rotate(360deg)}}
.table-wrap tbody tr{cursor:pointer}
[data-v]{cursor:pointer}
.ui-chart-tip{position:fixed;z-index:9999;transform:translate(-50%,-100%);background:#081f5c;color:#fff;font-size:12px;font-weight:700;padding:4px 9px;border-radius:7px;pointer-events:none;opacity:0;transition:opacity .12s;white-space:nowrap}
.ui-chart-tip.in{opacity:1}
@media(max-width:860px){.sidebar{display:none}.page{padding:18px}}
.ic{width:18px;height:18px;display:block}
.stat-ico .ic{width:18px;height:18px}
img.profile-avatar{object-fit:cover;border:1px solid var(--border)}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);padding:36px;box-shadow:var(--shadow);overflow:hidden}
.hero-title{margin:0;font-size:30px;font-weight:var(--heading-weight,800);text-transform:var(--heading-transform,none);line-height:1.1}
.hero-sub{margin:14px 0 0;color:var(--muted-fg);font-size:15px;line-height:1.5;max-width:46ch}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.hero-media{height:260px;border-radius:var(--radius);overflow:hidden;border:var(--border-width,1px) solid var(--border)}
.hero-media img{width:100%;height:100%;object-fit:cover;display:block}
@media(max-width:760px){.hero{grid-template-columns:1fr}.hero-media{height:200px}}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.gallery-card{margin:0;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
.gallery-card img{width:100%;height:150px;object-fit:cover;display:block}
.gallery-card figcaption{display:flex;flex-direction:column;gap:2px;padding:12px 14px}
.gallery-card figcaption strong{font-size:14px;font-weight:700}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.feature-card{border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);padding:20px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px}
.feature-ico{width:44px;height:44px;border-radius:var(--radius);background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center}
.feature-ico .ic{width:22px;height:22px}
.feature-title{font-size:15px;font-weight:700}
.pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:stretch}
.price-card{position:relative;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:24px;display:flex;flex-direction:column;gap:14px;text-align:center}
.price-featured{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary) inset,var(--shadow)}
.price-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--primary-fg);font-size:11px;font-weight:700;padding:3px 12px;border-radius:999px;white-space:nowrap}
.price-name{margin:0;font-size:15px;font-weight:700}
.price-amount{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums}
.price-cta{margin-top:auto}
.quotes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.quote-card{margin:0;border:var(--border-width,1px) solid var(--border);border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow);padding:22px;display:flex;flex-direction:column;gap:16px}
.quote-text{margin:0;font-size:14px;line-height:1.6;color:var(--fg)}
.quote-by{display:flex;align-items:center;gap:12px;margin:0}
.quote-avatar{width:40px;height:40px;border-radius:999px;object-fit:cover;flex-shrink:0}
.quote-by span{display:flex;flex-direction:column;font-size:13px;font-weight:700}
.quote-by small{font-weight:500}
.stepper{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.step{display:flex;gap:14px;align-items:flex-start}
.step-num{flex-shrink:0;width:30px;height:30px;border-radius:999px;background:var(--primary);color:var(--primary-fg);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
.step-body{display:flex;flex-direction:column;gap:3px}
.step-body strong{font-size:14px;font-weight:700}
.prog-list{display:grid;gap:16px}
.prog-row{display:grid;gap:7px}
.prog-head{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--muted-fg)}
.prog-head strong{color:var(--fg);font-weight:700;font-variant-numeric:tabular-nums}
.prog-track{height:8px;border-radius:999px;background:var(--muted);overflow:hidden}
.prog-fill{height:100%;border-radius:999px;background:var(--primary)}
.map-body{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:stretch}
@media(max-width:620px){.map-body{grid-template-columns:1fr}}
.map-canvas{position:relative;min-height:200px;border-radius:var(--radius);border:1px solid var(--border);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 12%,var(--card)),var(--muted));overflow:hidden}
.map-canvas::before{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:28px 28px;opacity:.4}
.map-pin{position:absolute;width:14px;height:14px;border-radius:999px 999px 999px 0;background:var(--primary);transform:translate(-50%,-100%) rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.25)}
.map-list{list-style:none;margin:0;padding:0;display:grid;gap:12px;align-content:start}
.map-list li{display:flex;gap:10px;align-items:flex-start;font-size:13px}
.map-list strong{display:block;font-weight:700}
.map-dot{margin-top:5px;width:8px;height:8px;border-radius:999px;background:var(--primary);flex-shrink:0}
.kanban{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:start}
.kb-col{background:var(--muted);border-radius:var(--radius);padding:12px;display:grid;gap:10px;align-content:start}
.kb-col-head{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted-fg)}
.kb-cards{display:grid;gap:8px}
.kb-card{background:var(--card);border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:3px;box-shadow:var(--shadow)}
.kb-card strong{font-weight:600}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.cal-dow{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted-fg);text-align:center;padding-bottom:4px}
.cal-cell{min-height:64px;border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);padding:6px;display:flex;flex-direction:column;gap:4px;background:var(--card)}
.cal-empty{background:var(--muted);border-style:dashed}
.cal-day{font-size:12px;font-weight:700;color:var(--muted-fg)}
.cal-event{font-size:10px;font-weight:600;background:var(--accent);color:var(--accent-fg);border-radius:6px;padding:2px 5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* ---- Responsive hardening: never let any surface overflow its width ---- */
html,body{max-width:100%;overflow-x:hidden}
.shell,.main,.page,.grid,.cell,.topbar,.card,.block{min-width:0;max-width:100%}
.chart,.table-wrap{overflow-x:auto}
.chart-svg{overflow:hidden}
@media(max-width:860px){
  .topbar{padding:12px 16px;gap:10px}
  .topbar .search-top{display:none}
  .stats-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
}
@media(max-width:560px){
  .page{padding:16px}
  .stats-grid{grid-template-columns:1fr}
  .hero{padding:22px}
  .hero-title{font-size:24px}
  .pie-wrap{gap:18px}
  .pie-svg{width:150px;height:150px}
}
${ds.css ?? ""}
</style>
</head>
<body>
  ${body}
  ${PREVIEW_JS}
</body>
</html>`;
}
