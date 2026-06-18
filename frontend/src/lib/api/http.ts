import type { AuthSession } from "@/types/auth";
import { getAccessToken, saveSession, clearSession } from "@/lib/api/auth";

const DEFAULT_BASE_URL = "http://localhost:8080/v1";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL;
}

const SESSION_KEY = "dashboardcraft_session";

interface BackendErrorBody {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as AuthSession;
    return session.refreshToken ?? null;
  } catch {
    return null;
  }
}

async function parseError(res: Response): Promise<Error> {
  let message = res.statusText || `Request failed with status ${res.status}`;
  try {
    const body = (await res.json()) as BackendErrorBody;
    if (body?.error?.message) {
      message = body.error.message;
    }
  } catch {
    // ignore JSON parse errors and fall back to status text
  }
  return new Error(message);
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

interface RequestOptions {
  /** Send a fresh Idempotency-Key header (for generation POSTs). */
  idempotent?: boolean;
  /** Skip the 401 refresh-and-retry flow (used by the refresh call itself). */
  skipRefresh?: boolean;
}

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const session = (await res.json()) as AuthSession;
    saveSession(session);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const buildHeaders = (): Headers => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.idempotent && typeof crypto !== "undefined" && crypto.randomUUID) {
      headers.set("Idempotency-Key", crypto.randomUUID());
    }
    return headers;
  };

  const url = `${getApiBaseUrl()}${path}`;
  const init: RequestInit = {
    method,
    headers: buildHeaders(),
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let res = await fetch(url, init);

  if (res.status === 401 && !options.skipRefresh) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await fetch(url, { ...init, headers: buildHeaders() });
    } else {
      clearSession();
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  return parseBody<T>(res);
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
