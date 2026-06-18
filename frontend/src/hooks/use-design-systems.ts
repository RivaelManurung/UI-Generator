"use client";

import { useEffect, useState } from "react";

import {
  fetchDesignSystems,
  DEFAULT_DESIGN_SYSTEM,
  type DesignSystem,
} from "@/lib/generation/design-systems";

// Module-level cache so cards + dialogs across a page share one fetch.
let cache: DesignSystem[] | null = null;

export function useDesignSystems(): DesignSystem[] {
  const [list, setList] = useState<DesignSystem[]>(cache ?? [DEFAULT_DESIGN_SYSTEM]);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetchDesignSystems()
      .then((ds) => {
        if (!cancelled && ds.length) {
          cache = ds;
          setList(ds);
        }
      })
      .catch(() => {
        /* keep the default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return list;
}
