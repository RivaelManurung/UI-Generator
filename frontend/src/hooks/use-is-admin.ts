"use client";

import { useEffect, useState } from "react";

import { http } from "@/lib/api/http";
import { getAccessToken } from "@/lib/api/auth";
import { getCachedAdmin, setCachedAdmin } from "@/lib/api/admin-cache";
import type { AuthUser } from "@/types/auth";

// Authoritative admin check via GET /auth/me (never trusts localStorage role).
// Cached at module level (shared via admin-cache so logout can reset it) so
// repeated mounts don't refetch. UI-gating only — the backend still enforces
// admin on every protected endpoint.
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState<boolean>(getCachedAdmin() ?? false);

  useEffect(() => {
    if (getCachedAdmin() !== null) return;
    if (!getAccessToken()) return;
    http
      .get<{ user: AuthUser }>("/auth/me")
      .then(({ user }) => {
        const ok = user.role === "admin";
        setCachedAdmin(ok);
        setIsAdmin(ok);
      })
      .catch(() => {
        /* leave as non-admin */
      });
  }, []);

  return isAdmin;
}
