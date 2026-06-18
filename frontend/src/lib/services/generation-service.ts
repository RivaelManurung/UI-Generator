import {
  GenerationVersion,
  GeneratedFile,
  GenerationJob,
  PageSchema,
} from "@/types/generation";
import { http, getApiBaseUrl } from "@/lib/api/http";
import { getAccessToken } from "@/lib/api/auth";

// Download every generated file of a project as a single .zip (server-built).
// Uses a raw authed fetch (not the JSON http client) because the body is binary.
export async function downloadProjectZip(projectId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/projects/${projectId}/export.zip`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
  });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* keep the status message */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "dashboard.zip";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface GeneratedPage {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  qualityScore: number;
  schema: PageSchema;
  files: GeneratedFile[];
}

// Terminal generation-job states (worker.go). "succeeded" is the only success;
// "refunded"/"canceled" mean the run stopped and the reserved credit was returned.
const TERMINAL_JOB_STATES = new Set([
  "succeeded",
  "failed",
  "refunded",
  "canceled",
  "cancelled",
]);

/**
 * Poll a single-page generation job until it reaches a terminal state.
 * Bounded so the UI never spins forever if the async worker is unavailable
 * (e.g. Redis down) — on timeout it resolves with `status: "timeout"` so the
 * caller can show an honest "still working" message instead of a fake failure.
 */
export async function pollGenerationJob(
  jobId: string,
  { intervalMs = 2000, timeoutMs = 60_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{ status: string }> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let status = "queued";
    try {
      const res = await http.get<{ job: { status: string } }>(`/generation-jobs/${jobId}`);
      status = res.job?.status ?? "queued";
    } catch {
      // Transient read error — keep polling until the deadline.
    }
    if (TERMINAL_JOB_STATES.has(status)) return { status };
    if (Date.now() >= deadline) return { status: "timeout" };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export const generationService = {
  // Generate several coherent pages (dashboard, list, detail, form) from one prompt.
  async generatePages(
    projectId: string,
    prompt: string,
    themeSlug: string,
    pageCount: number,
  ): Promise<GeneratedPage[]> {
    return http.post<GeneratedPage[]>(
      `/projects/${projectId}/generate-pages`,
      { prompt, themeSlug, pageCount },
      { idempotent: true },
    );
  },

  // Load all of a project's pages (with their current schema + code) for the studio tabs.
  async getProjectPages(projectId: string): Promise<GeneratedPage[]> {
    return http.get<GeneratedPage[]>(`/projects/${projectId}/app-pages`);
  },

  // Rename a single screen. The backend re-slugs from the new name, so the
  // returned slug is authoritative — callers should re-select by it.
  async renamePage(
    pageId: string,
    name: string,
    pageType: string,
  ): Promise<{ slug: string }> {
    const res = await http.patch<{ page: { slug: string } }>(`/pages/${pageId}`, {
      name,
      pageType,
    });
    return { slug: res.page?.slug ?? "" };
  },

  // Soft-delete a single screen.
  async deletePage(pageId: string): Promise<void> {
    await http.delete(`/pages/${pageId}`);
  },

  // Regenerate one screen from a fresh prompt (async — returns a job to poll).
  async regeneratePage(
    pageId: string,
    body: { prompt: string; pageType: string; themeSlug: string },
  ): Promise<{ jobId: string; status: string }> {
    return http.post<{ jobId: string; status: string }>(
      `/pages/${pageId}/generate`,
      body,
      { idempotent: true },
    );
  },
  async getVersions(projectId: string): Promise<GenerationVersion[]> {
    return http.get<GenerationVersion[]>(`/projects/${projectId}/versions`);
  },

  async getActiveVersion(projectId: string): Promise<GenerationVersion | null> {
    return http.get<GenerationVersion | null>(`/projects/${projectId}/versions/active`);
  },

  async getFiles(projectId: string, versionId: string): Promise<GeneratedFile[]> {
    return http.get<GeneratedFile[]>(`/projects/${projectId}/versions/${versionId}/files`);
  },

  async restoreVersion(projectId: string, versionId: string): Promise<GenerationVersion | null> {
    return http.post<GenerationVersion>(
      `/projects/${projectId}/versions/${versionId}/restore`,
    );
  },

  async createGenerationJob(payload: {
    projectId: string;
    prompt: string;
    themeSlug: string;
  }): Promise<GenerationJob> {
    return http.post<GenerationJob>(
      `/projects/${payload.projectId}/generations`,
      { prompt: payload.prompt, themeSlug: payload.themeSlug },
      { idempotent: true },
    );
  },

  async compileGenerationVersion(
    projectId: string,
    prompt: string,
    themeSlug: string,
  ): Promise<GenerationVersion> {
    await http.post<GenerationJob>(
      `/projects/${projectId}/generations`,
      { prompt, themeSlug },
      { idempotent: true },
    );
    const active = await http.get<GenerationVersion | null>(
      `/projects/${projectId}/versions/active`,
    );
    if (!active) {
      throw new Error("Generation completed but no active version was returned.");
    }
    return active;
  },

  async refineSection(payload: {
    projectId: string;
    sectionName: string;
    instruction: string;
    themeSlug: string;
  }): Promise<GenerationVersion> {
    return http.post<GenerationVersion>(
      `/projects/${payload.projectId}/generations/refine`,
      {
        sectionName: payload.sectionName,
        instruction: payload.instruction,
        themeSlug: payload.themeSlug,
      },
      { idempotent: true },
    );
  },
};
