/**
 * Maps a prompt / page type to the layout family the generator will actually
 * produce, so the live progress (analyzing steps + preview skeleton) reflects
 * what is being built instead of always showing a dashboard.
 *
 * The renderer (`preview-compiler.ts`) has two real shells:
 *  - auth pages (`pageType === "login"` or an `authForm` section) → a centered
 *    glass card on a gradient (no sidebar / charts / table);
 *  - everything else → the admin shell (sidebar + header + section grid).
 * `table`/`form` are admin-shell variants that lead with the matching section.
 */

export type LayoutKind = "auth" | "dashboard" | "table" | "form" | "generic" | "mobile";

export type AuthVariant = "login" | "register" | "forgot";

/** Strong, structural inference from a concrete page type (most reliable). */
export function kindFromPageType(pageType?: string | null): LayoutKind | null {
  const t = (pageType ?? "").toLowerCase();
  if (!t || t === "auto" || t === "…") return null;
  if (/login|log-?in|sign-?in|sign-?up|signup|register|forgot|reset|auth/.test(t)) return "auth";
  if (/dashboard|analytics|overview|report|home/.test(t)) return "dashboard";
  if (/list|table|grid|inventory|directory|catalog|records/.test(t)) return "table";
  if (/form|create|edit|wizard|settings|profile|detail/.test(t)) return "form";
  return null;
}

/** Best-effort inference from the free-text prompt during the planning phase. */
export function kindFromPrompt(prompt: string): LayoutKind {
  const p = prompt.toLowerCase();

  const mentionsLogin = /\b(login|log ?in|sign ?in|signin)\b/.test(p) || /\bmasuk\b/.test(p);
  const mentionsAuthPeer =
    /\b(register|registration|sign ?up|signup|forgot password|reset password|password)\b/.test(p) ||
    /\b(daftar|lupa (kata sandi|password)|kata sandi)\b/.test(p);
  const mentionsAuthSystem = /authentication|auth system|sistem autentikasi|autentikasi/.test(p);

  // An auth FLOW (login + a peer page, or an explicit auth system) wins even when
  // the prompt also name-drops "dashboard" as a visual style reference.
  if ((mentionsLogin && mentionsAuthPeer) || mentionsAuthSystem) return "auth";

  const mentionsDashboard = /\b(dashboard|analytics|kpi|metrics|charts?|overview|admin panel|report)\b/.test(p);
  if (mentionsDashboard) return "dashboard";

  if (/\b(table|list|data table|inventory|directory|catalog|records|crud)\b/.test(p)) return "table";
  if (/\b(form|input fields|survey|wizard|checkout|onboarding)\b/.test(p)) return "form";

  if (mentionsLogin) return "auth";
  return "dashboard";
}

export function resolveLayoutKind(prompt: string, pageType?: string | null): LayoutKind {
  return kindFromPageType(pageType) ?? kindFromPrompt(prompt);
}

/** Pick the auth sub-variant from a screen's name/type (login vs register vs forgot). */
export function authVariantFrom(name?: string | null, pageType?: string | null): AuthVariant {
  const s = `${name ?? ""} ${pageType ?? ""}`.toLowerCase();
  if (/register|sign ?up|signup|create account|daftar/.test(s)) return "register";
  if (/forgot|reset|recover|lupa/.test(s)) return "forgot";
  return "login";
}

const DASHBOARD_STEPS = [
  "Setting up document",
  "Building sidebar navigation",
  "Building page header",
  "Creating statistics cards",
  "Generating charts",
  "Building data table",
  "Adding interactivity",
  "Finalizing dashboard",
] as const;

const AUTH_STEPS = [
  "Setting up document",
  "Composing the auth card",
  "Adding brand & heading",
  "Building input fields",
  "Adding social sign-in",
  "Wiring validation states",
  "Finalizing auth flow",
] as const;

const TABLE_STEPS = [
  "Setting up document",
  "Building sidebar navigation",
  "Building page header",
  "Adding filter toolbar",
  "Building data table",
  "Adding row actions",
  "Finalizing layout",
] as const;

const FORM_STEPS = [
  "Setting up document",
  "Building sidebar navigation",
  "Building page header",
  "Composing form fields",
  "Adding validation states",
  "Adding submit actions",
  "Finalizing layout",
] as const;

const GENERIC_STEPS = [
  "Setting up document",
  "Building layout structure",
  "Building page header",
  "Adding content sections",
  "Adding interactivity",
  "Finalizing layout",
] as const;

// Native mobile app screen — NO sidebar / data-table language. Mirrors the
// phone shell the renderer produces (app bar + stacked cards + bottom tab bar).
const MOBILE_STEPS = [
  "Setting up screen",
  "Building app bar",
  "Composing hero card",
  "Laying out quick actions",
  "Adding content cards",
  "Building bottom tab bar",
  "Finalizing app screen",
] as const;

const STEPS_BY_KIND: Record<LayoutKind, readonly string[]> = {
  auth: AUTH_STEPS,
  dashboard: DASHBOARD_STEPS,
  table: TABLE_STEPS,
  form: FORM_STEPS,
  generic: GENERIC_STEPS,
  mobile: MOBILE_STEPS,
};

export function stepsForKind(kind: LayoutKind): readonly string[] {
  return STEPS_BY_KIND[kind];
}
