import { useState, useEffect, useCallback } from "react";
import { GenerationVersion } from "@/types/generation";
import { generationService } from "@/lib/services/generation-service";

export function useGenerationVersions(projectId: string) {
  const [versions, setVersions] = useState<GenerationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GenerationVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const allVers = await generationService.getVersions(projectId);
      const activeVer = await generationService.getActiveVersion(projectId);
      setVersions(allVers);
      setActiveVersion(activeVer);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load project versions");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const restoreVersion = useCallback(async (versionId: string) => {
    setLoading(true);
    try {
      const restored = await generationService.restoreVersion(projectId, versionId);
      if (restored) {
        setActiveVersion(restored);
        const allVers = await generationService.getVersions(projectId);
        setVersions(allVers);
      }
      setError(null);
      return restored;
    } catch (err: any) {
      setError(err?.message ?? "Failed to restore version");
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refineSection = useCallback(async (sectionName: string, instruction: string, themeSlug: string) => {
    setLoading(true);
    try {
      const refined = await generationService.refineSection({
        projectId,
        sectionName,
        instruction,
        themeSlug,
      });
      setActiveVersion(refined);
      const allVers = await generationService.getVersions(projectId);
      setVersions(allVers);
      setError(null);
      return refined;
    } catch (err: any) {
      setError(err?.message ?? "Section refinement failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    versions,
    activeVersion,
    loading,
    error,
    refresh: fetchVersions,
    restoreVersion,
    refineSection,
    setActiveVersion,
  };
}
