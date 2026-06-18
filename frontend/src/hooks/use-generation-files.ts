import { useState, useEffect, useCallback } from "react";
import { GeneratedFile } from "@/types/generation";
import { generationService } from "@/lib/services/generation-service";

export function useGenerationFiles(projectId: string, versionId?: string) {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!projectId || !versionId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const data = await generationService.getFiles(projectId, versionId);
      setFiles(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch version files");
    } finally {
      setLoading(false);
    }
  }, [projectId, versionId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    refresh: fetchFiles,
  };
}
