import { useState, useCallback, useRef } from "react";
import { GenerationStatus, GenerationVersion } from "@/types/generation";
import { startMockGeneration } from "@/lib/generation/mock-generation-runner";

export function useGenerationJob() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<GenerationVersion | null>(null);

  const runnerRef = useRef<{ cancel: () => void } | null>(null);

  const startGeneration = useCallback(
    async (projectId: string, prompt: string, themeSlug: string) => {
      setError(null);
      setStatus("queued");
      setProgress(5);

      try {
        // Cancel existing job if active
        if (runnerRef.current) {
          runnerRef.current.cancel();
        }

        // Start progress state machine. The runner performs a single backend
        // generation (POST /generations) and then loads the active version,
        // so credits are charged exactly once per run.
        runnerRef.current = startMockGeneration({
          projectId,
          prompt,
          themeSlug,
          onStateChange: (newStatus, newProgress) => {
            setStatus(newStatus);
            setProgress(newProgress);
          },
          onComplete: (newVersion) => {
            setActiveVersion(newVersion);
            runnerRef.current = null;
          },
          onFail: (errMessage) => {
            setError(errMessage);
            runnerRef.current = null;
          },
        });
      } catch (err: any) {
        setStatus("failed");
        setProgress(100);
        setError(err?.message ?? "Failed to start generation job");
      }
    },
    []
  );

  const cancelGeneration = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.cancel();
      runnerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus("idle");
    setProgress(0);
  }, []);

  return {
    status,
    progress,
    error,
    isGenerating: status !== "idle" && status !== "completed" && status !== "failed" && status !== "cancelled",
    activeVersion,
    startGeneration,
    cancelGeneration,
    clearError,
    setActiveVersion,
  };
}
