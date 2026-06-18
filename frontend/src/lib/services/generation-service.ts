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
