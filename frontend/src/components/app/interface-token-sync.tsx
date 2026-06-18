"use client";

import { useEffect } from "react";

// shadcn design tokens that `.app-interface` / `.admin-interface` override to the
// neutral dashboard palette. Radix dialogs/sheets portal to <body> (outside those
// scopes) and would otherwise fall back to the app's planetary `:root` tokens —
// leaving stray blue buttons. This mirrors the resolved scope tokens onto <body>
// while mounted so every portal matches the surrounding chrome.
const TOKENS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--accent-foreground", "--destructive", "--border", "--input", "--ring", "--radius",
];

export function InterfaceTokenSync({ selector }: { selector: string }) {
  useEffect(() => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    const cs = getComputedStyle(el);
    const prev: Record<string, string> = {};
    for (const k of TOKENS) {
      prev[k] = document.body.style.getPropertyValue(k);
      const v = cs.getPropertyValue(k).trim();
      if (v) document.body.style.setProperty(k, v);
    }
    return () => {
      for (const k of TOKENS) {
        if (prev[k]) document.body.style.setProperty(k, prev[k]);
        else document.body.style.removeProperty(k);
      }
    };
  }, [selector]);
  return null;
}
