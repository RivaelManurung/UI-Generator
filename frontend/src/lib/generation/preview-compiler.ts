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

/* ----------------------------------------------------------------- images */
// Deterministic placeholder media so generated UIs feel populated (real avatars +
// photos), Stitch-style, without needing an image model. Both load fine inside the
// sandboxed preview iframe (image loads aren't blocked by the sandbox).
function seedOf(value: string): string {
  return encodeURIComponent((value || "ui").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40) || "ui");
}
function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seedOf(seed)}&backgroundType=gradientLinear&fontWeight=700`;
}
function hashNum(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 100000;
  return h;
}
// photoFor resolves an image source: a real http(s) URL passed straight through
// (e.g. produced by an image-gen provider), OR keyword(s) → a CONTENT-RELEVANT
// stock photo (loremflickr), OR a stable random photo when no hint is given.
function photoFor(hint: string | undefined, fallbackSeed: string, w: number, h: number): string {
  const v = (hint ?? "").trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v) {
    const tags = v.toLowerCase().replace(/[^a-z0-9\s,]/g, "").trim().replace(/[\s,]+/g, ",").slice(0, 60);
    return `https://loremflickr.com/${w}/${h}/${tags}?lock=${hashNum(v)}`;
  }
  return `https://picsum.photos/seed/${seedOf(fallbackSeed)}/${w}/${h}`;
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
/** Deterministic wave values (0..1) so previews are stable across renders. */
function wave(count: number): number[] {
  const n = Math.max(count, 2);
  return Array.from({ length: n }, (_, i) => Math.sin((i + 1) * 1.3) * 0.5 + 0.5);
}

function barChartSvg(): string {
  const vals = wave(9);
  const W = 600;
  const H = 200;
  const gap = 14;
  const bw = (W - gap * (vals.length - 1)) / vals.length;
  const bars = vals
    .map((v, i) => {
      const h = 24 + v * (H - 40);
      const x = i * (bw + gap);
      const y = H - h;
      const fill = i === vals.length - 1 ? "var(--chart-1)" : "var(--chart-2)";
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${fill}" opacity="${i === vals.length - 1 ? 1 : 0.85}"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="bar chart">${bars}</svg>`;
}

function lineChartSvg(): string {
  const vals = wave(8);
  const W = 600;
  const H = 200;
  const P = 6;
  const pts = vals.map((v, i) => {
    const x = P + (i * (W - 2 * P)) / (vals.length - 1);
    const y = H - P - v * (H - 2 * P);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H - P} L ${pts[0][0].toFixed(1)} ${H - P} Z`;
  const grid = [0, 0.33, 0.66, 1]
    .map((f) => {
      const y = (P + f * (H - 2 * P)).toFixed(1);
      return `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="line chart">
    ${grid}
    <path d="${area}" fill="var(--chart-fill)"/>
    <path d="${line}" fill="none" stroke="var(--chart-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function pieChartSvg(): string {
  const segs = [
    { v: 38, c: "var(--chart-1)" },
    { v: 27, c: "var(--chart-2)" },
    { v: 20, c: "var(--chart-3)" },
    { v: 15, c: "var(--chart-4)" },
  ];
  const total = segs.reduce((a, s) => a + s.v, 0);
  const R = 78;
  const sw = 26;
  const circ = 2 * Math.PI * R;
  let acc = 0;
  const rings = segs
    .map((s) => {
      const frac = s.v / total;
      const dash = frac * circ;
      const el = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${s.c}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-acc * circ).toFixed(2)}" transform="rotate(-90 100 100)"/>`;
      acc += frac;
      return el;
    })
    .join("");
  const legend = segs
    .map((s) => `<span class="legend"><i style="background:${s.c}"></i>${Math.round((s.v / total) * 100)}%</span>`)
    .join("");
  return `<div class="pie-wrap"><svg viewBox="0 0 200 200" class="pie-svg" role="img" aria-label="pie chart">${rings}</svg><div class="legend-list">${legend}</div></div>`;
}

function stackedBarSvg(): string {
  const groups = 7;
  const W = 600;
  const H = 200;
  const gap = 18;
  const bw = (W - gap * (groups - 1)) / groups;
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  const bars = Array.from({ length: groups }, (_, i) => {
    const segs = [0.5 + 0.4 * Math.abs(Math.sin(i + 1)), 0.3 + 0.25 * Math.abs(Math.cos(i * 1.3)), 0.18 + 0.18 * Math.abs(Math.sin(i * 0.7))];
    const totalUnit = segs.reduce((a, b) => a + b, 0);
    const x = i * (bw + gap);
    let y = H;
    return segs
      .map((s, si) => {
        const h = (s / totalUnit) * (0.45 + 0.5 * Math.abs(Math.sin(i + 2))) * H;
        y -= h;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${colors[si]}" rx="2"/>`;
      })
      .join("");
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="stacked bar chart">${bars}</svg>`;
}

function multiLineSvg(): string {
  const W = 600;
  const H = 200;
  const P = 6;
  const series = [
    { c: "var(--chart-1)", phase: 0 },
    { c: "var(--chart-2)", phase: 1.6 },
    { c: "var(--chart-3)", phase: 3.1 },
  ];
  const n = 9;
  const paths = series
    .map((s) => {
      const pts = Array.from({ length: n }, (_, i) => {
        const v = Math.sin((i + 1) * 0.9 + s.phase) * 0.4 + 0.5;
        const x = P + (i * (W - 2 * P)) / (n - 1);
        const y = H - P - v * (H - 2 * P);
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ");
      return `<path d="${pts}" fill="none" stroke="${s.c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="multi-line chart">${paths}</svg>`;
}

function renderChartPanel(section: SchemaSection): string {
  const type = (section.chartType ?? "bar").toLowerCase();
  const body =
    type.includes("pie") || type.includes("donut")
      ? pieChartSvg()
      : type.includes("stack")
        ? stackedBarSvg()
        : type.includes("multi")
          ? multiLineSvg()
          : type.includes("line") || type.includes("area")
            ? lineChartSvg()
            : barChartSvg();
  return `
    <section class="block card">
      <div class="card-head-row">
        <h2 class="block-title">${esc(section.title ?? "Chart")}</h2>
        ${section.chartType ? `<span class="pill">${esc(section.chartType)}</span>` : ""}
      </div>
      <div class="chart">${body}</div>
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

// sparklineSvg draws a tiny deterministic trend line for a stat card.
function sparklineSvg(seed: string, down: boolean): string {
  const n = 12;
  const phase = hashNum(seed) % 7;
  const W = 120;
  const H = 32;
  const P = 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const v = Math.sin((i + 1 + phase) * 0.85) * 0.42 + 0.5;
    const x = P + (i * (W - 2 * P)) / (n - 1);
    const y = H - P - v * (H - 2 * P);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}" fill="none" stroke="${down ? "var(--trend-down)" : "var(--trend-up)"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/* --------------------------------------------------------------- sections */
function renderStatsGrid(section: SchemaSection): string {
  const items = section.items ?? [];
  const cards = items
    .map(
      (item) => {
        const down = /^[-−]|down|turun|▼|▾|loss/i.test((item.trend ?? "").trim());
        return `
      <article class="stat-card">
        <div class="stat-top">
          <span class="stat-label">${esc(item.label)}</span>
          <span class="stat-ico">${icon(item.icon || item.label)}</span>
        </div>
        <strong class="stat-value">${esc(item.value)}</strong>
        ${trendHtml(item.trend)}
        ${sparklineSvg(item.label || item.value, down)}
      </article>`;
      },
    )
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
      <input class="search" type="text" placeholder="${esc(section.searchPlaceholder ?? "Search")}" disabled />
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
        <input class="field-input" type="${esc(field.type || "text")}" placeholder="${esc(field.hint ?? "")}" disabled />
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
        <img class="profile-avatar" src="${avatarUrl(entityName)}" alt="${esc(entityName)} avatar" loading="lazy" />
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
    .map((tab, index) => `<button class="tab ${index === 0 ? "active" : ""}">${esc(tab.label)}</button>`)
    .join("");
  const firstItems = (tabs[0]?.items ?? []).map((item) => `<li>${esc(item)}</li>`).join("");
  return `
    <section class="block card">
      ${section.title ? `<h2 class="block-title">${esc(section.title)}</h2>` : ""}
      <div class="tabs">${headers}</div>
      <ul class="tab-list">${firstItems}</ul>
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
  return `
    <section class="block card placeholder">
      <h2 class="block-title">${esc(section.title ?? label)}</h2>
      <p class="muted">${esc(label)} preview</p>
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
      <div class="hero-media"><img src="${photoFor(section.image || section.title, section.title ?? "hero", 720, 480)}" alt="" loading="lazy" /></div>
    </section>`;
}

function renderGallery(section: SchemaSection): string {
  const cards = (section.items ?? [])
    .map(
      (item) => `
      <figure class="gallery-card">
        <img src="${photoFor(item.image || item.label, item.label || item.value || "g", 480, 320)}" alt="${esc(item.label)}" loading="lazy" />
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
          <img class="quote-avatar" src="${avatarUrl(item.label || "user")}" alt="" loading="lazy" />
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

function renderSidebar(schema: PageSchema, opts: PreviewOptions): string {
  const brand = opts.brand?.trim() || "DashboardCraft";
  const items = navForDomain(schema.domain);
  const activeIdx = activeNavIndex(items, schema);
  const navLink = (it: NavEntry, active: boolean) =>
    `<a class="nav-item ${active ? "active" : ""}"><span class="nav-ico">${icon(it.icon)}</span><span class="nav-text">${esc(it.label)}</span></a>`;
  const mainLinks = items.map((it, i) => navLink(it, i === activeIdx)).join("");
  const secondary = NAV_SECONDARY.map((it) => navLink(it, false)).join("");
  return `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">&#9670;</span><span class="brand-text">${esc(brand)}</span></div>
      <div class="nav-label">Menu</div>
      ${mainLinks}
      <div class="nav-label">Workspace</div>
      ${secondary}
      <div class="sidebar-foot">
        <span class="avatar"></span>
        <small>${esc(brand)}<br/><span class="muted">${esc((schema.domain || "workspace").replace(/^./, (c) => c.toUpperCase()))}</span></small>
      </div>
    </aside>`;
}

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

  const body = shell
    ? `<div class="shell">
    ${renderSidebar(schema, opts)}
    <div class="main">
      <div class="topbar">
        <div class="crumb">${esc(schema.title)}<span> · ${esc(schema.domain || "custom")}</span></div>
        <div class="topbar-actions">
          <span class="search-top">Search…</span>
          <span class="t-avatar"></span>
        </div>
      </div>
      <main class="page">
        ${head}
        ${sections}
      </main>
    </div>
  </div>`
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
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 28px;border-bottom:1px solid var(--topbar-border);background:var(--topbar-bg);color:var(--topbar-fg)}
.topbar .crumb{font-weight:700;font-size:14px}
.topbar .crumb span{opacity:.6;font-weight:500}
.topbar-actions{display:flex;align-items:center;gap:10px}
.search-top{border:1px solid color-mix(in srgb,var(--topbar-fg) 22%,transparent);border-radius:var(--radius);padding:8px 14px;font-size:13px;color:color-mix(in srgb,var(--topbar-fg) 65%,transparent);min-width:200px}
.t-avatar{width:32px;height:32px;border-radius:999px;background:color-mix(in srgb,var(--topbar-fg) 18%,transparent);flex-shrink:0}
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
.card-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.card-head-row .block-title{margin:0}
.chart{width:100%}
.chart-svg{width:100%;height:190px;display:block}
.pie-wrap{display:flex;align-items:center;gap:32px;flex-wrap:wrap;justify-content:center}
.pie-svg{width:190px;height:190px;flex-shrink:0}
.legend-list{display:flex;flex-direction:column;gap:10px}
.legend{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted-fg);font-weight:600}
.legend i{width:12px;height:12px;border-radius:3px;display:inline-block}
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
${ds.css ?? ""}
</style>
</head>
<body>
  ${body}
</body>
</html>`;
}
