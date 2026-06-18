import { AuthUser, AuthSession } from "@/types/auth";
import { http, getApiBaseUrl } from "@/lib/api/http";
import {
  saveSession,
  clearSession,
  getCurrentUser as getStoredUser,
} from "@/lib/api/auth";

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem("dashboardcraft_session");
    if (!stored) return null;
    return (JSON.parse(stored) as AuthSession).refreshToken ?? null;
  } catch {
    return null;
  }
}

/** Plain fetch helper for unauthenticated auth endpoints (login/register/refresh). */
async function authPost(path: string, body: unknown): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      // fall back to status text
    }
    throw new Error(message);
  }
  return (await res.json()) as AuthSession;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const session = await authPost("/auth/login", { email, password });
    saveSession(session);
    return session;
  },

  async register(name: string, email: string, password: string): Promise<AuthSession> {
    const session = await authPost("/auth/register", { name, email, password });
    saveSession(session);
    return session;
  },

  async refresh(): Promise<AuthSession | null> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const session = await authPost("/auth/refresh", { refreshToken });
      saveSession(session);
      return session;
    } catch {
      clearSession();
      return null;
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const stored = getStoredUser();
    if (!stored) return null;
    try {
      return await http.get<AuthUser>("/auth/me");
    } catch {
      return null;
    }
  },

  async logout(): Promise<boolean> {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await http.post<{ success: boolean }>("/auth/logout", { refreshToken });
      }
    } catch {
      // best-effort logout; clear local session regardless
    } finally {
      clearSession();
    }
    return true;
  },
};
