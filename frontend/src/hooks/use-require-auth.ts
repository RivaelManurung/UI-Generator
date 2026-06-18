"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { http } from "@/lib/api/http";
import { clearSession, getAccessToken } from "@/lib/api/auth";
import type { AuthUser } from "@/types/auth";

export type AuthGuardStatus = "checking" | "authorized" | "forbidden";

/**
 * useRequireAuth verifies the session against the backend (`GET /auth/me`),
 * which is the source of truth for the user's role. It never trusts the
 * client-side localStorage role for authorization decisions:
 *  - no/invalid token  -> redirect to /login (the fake/stale session is cleared)
 *  - requiredRole unmet -> "forbidden"
 *  - otherwise          -> "authorized"
 */
export function useRequireAuth(requiredRole?: AuthUser["role"]): AuthGuardStatus {
  const router = useRouter();
  const [status, setStatus] = useState<AuthGuardStatus>("checking");

  useEffect(() => {
    let active = true;

    const redirectToLogin = () => {
      clearSession();
      const path = window.location.pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(path)}`);
    };

    if (!getAccessToken()) {
      redirectToLogin();
      return;
    }

    http
      .get<{ user: AuthUser }>("/auth/me")
      .then(({ user }) => {
        if (!active) return;
        if (requiredRole && user.role !== requiredRole) {
          setStatus("forbidden");
          return;
        }
        setStatus("authorized");
      })
      .catch(() => {
        if (!active) return;
        redirectToLogin();
      });

    return () => {
      active = false;
    };
  }, [router, requiredRole]);

  return status;
}
