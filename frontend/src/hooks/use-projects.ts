import { useState, useEffect, useCallback } from "react";
import { Project } from "@/types/project";
import { projectService } from "@/lib/services/project-service";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectService.listProjects();
      setProjects(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (payload: Omit<Project, "id" | "updatedAt" | "pagesCount" | "qualityAverage">) => {
    try {
      const newProj = await projectService.createProject(payload);
      setProjects((current) => [...current, newProj]);
      return newProj;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to create project");
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await projectService.deleteProject(projectId);
      setProjects((current) => current.filter((p) => p.id !== projectId));
      return true;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to delete project");
    }
  }, []);

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    deleteProject,
  };
}
