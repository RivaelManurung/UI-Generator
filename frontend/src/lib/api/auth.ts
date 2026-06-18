import { AuthUser, AuthSession } from "@/types/auth";
export type { AuthSession };

const bypassUser: AuthUser = {
  id: "rivael-user-id",
  name: "Rivael Manurung",
  email: "rivael@example.com",
  role: "admin",
};

export function isAuthBypassEnabled() {
  return false; // Real auth: credentials are exchanged with the backend.
}

export function getBypassSession(): AuthSession {
  return {
    user: bypassUser,
    accessToken: "mock-session-access-token",
    refreshToken: "mock-session-refresh-token",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

const SESSION_KEY = "dashboardcraft_session";

export function ensureBypassSession() {
  // Client-side local storage bypass removed for security compliance
}

export function saveSession(session: AuthSession) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error("Error saving session", e);
    }
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error("Error clearing session", e);
    }
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored) as AuthSession;
        if (session.expiresAt > Date.now()) {
          return session.accessToken;
        } else {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error("Error getting access token", e);
    }
  }
  return null;
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored) as AuthSession;
        if (session.expiresAt > Date.now()) {
          return session.user;
        } else {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error("Error getting current user", e);
    }
  }
  return null;
}

export async function readAuthResponse(response: Response) {
  return response.json();
}

export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Auth request failed: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
