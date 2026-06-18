import { Project } from "@/types/project";
import { http } from "@/lib/api/http";

export const projectService = {
  async listProjects(): Promise<Project[]> {
    return http.get<Project[]>("/projects");
  },

  async getProject(projectId: string): Promise<Project | null> {
    return http.get<Project | null>(`/projects/${projectId}`);
  },

  async createProject(
    payload: Omit<Project, "id" | "updatedAt" | "pagesCount" | "qualityAverage">,
  ): Promise<Project> {
    return http.post<Project>("/projects", payload);
  },

  async updateProject(projectId: string, payload: Partial<Project>): Promise<Project | null> {
    return http.put<Project>(`/projects/${projectId}`, payload);
  },

  async deleteProject(projectId: string): Promise<boolean> {
    await http.delete<{ success: boolean }>(`/projects/${projectId}`);
    return true;
  },
};
