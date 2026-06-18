"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { http, getApiBaseUrl } from "@/lib/api/http";
import { getAccessToken } from "@/lib/api/auth";
import type { GeneratedPage } from "@/lib/services/generation-service";

export type GenerationBatch = {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed";
  total: number;
  completed: number;
  pages: GeneratedPage[];
  error?: string;
};

interface GenerationContextValue {
  active: GenerationBatch | null;
  lastCompleted: GenerationBatch | null;
  start: (
    projectId: string,
    prompt: string,
    themeSlug: string,
    pageCount: number,
    auto?: boolean,
  ) => Promise<void>;
  clearLastCompleted: () => void;
}

const POLL_INTERVAL_MS = 2500;

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<GenerationBatch | null>(null);
  const [lastCompleted, setLastCompleted] = useState<GenerationBatch | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);

  const stopWatching = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.abort();
      streamRef.current = null;
    }
  }, []);

  const isTerminal = (b: GenerationBatch) => b.status === "completed" || b.status === "failed";

  const finish = useCallback(
    (batch: GenerationBatch) => {
      stopWatching();
      activeRef.current = false;
      if (batch.status === "completed") {
        setLastCompleted(batch);
        toast.success(`Generated ${batch.total} page${batch.total > 1 ? "s" : ""}`);
      } else {
        toast.error(batch.error || "Generation failed");
      }
      setActive(null);
    },
    [stopWatching],
  );

  // Fallback: poll the batch on an interval (used if the SSE stream fails).
  const pollBatch = useCallback(
    (batchId: string) => {
      stopWatching();
      pollRef.current = setInterval(async () => {
        try {
          const latest = await http.get<GenerationBatch>(`/generation-batches/${batchId}`);
          setActive(latest);
          if (isTerminal(latest)) finish(latest);
        } catch (err) {
          stopWatching();
          activeRef.current = false;
          toast.error(err instanceof Error ? err.message : "Generation failed");
          setActive(null);
        }
      }, POLL_INTERVAL_MS);
    },
    [finish, stopWatching],
  );

  // Primary: subscribe to Server-Sent Events for sub-second, per-screen updates.
  // Uses fetch streaming (not EventSource) so we can send the Bearer token.
  const streamBatch = useCallback(
    async (batchId: string) => {
      const controller = new AbortController();
      streamRef.current = controller;
      const res = await fetch(`${getApiBaseUrl()}/generation-batches/${batchId}/events`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const latest = JSON.parse(dataLine.slice(5).trim()) as GenerationBatch;
            setActive(latest);
            if (isTerminal(latest)) {
              finish(latest);
              return;
            }
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    },
    [finish],
  );

  const start = useCallback(
    async (
      projectId: string,
      prompt: string,
      themeSlug: string,
      pageCount: number,
      auto = false,
    ): Promise<void> => {
      if (activeRef.current) return;
      activeRef.current = true;

      try {
        const batch = await http.post<GenerationBatch>(
          `/projects/${projectId}/generate-pages`,
          { prompt, themeSlug, pageCount, auto },
          { idempotent: true },
        );
        setActive(batch);
        if (isTerminal(batch)) {
          finish(batch);
          return;
        }
        // Prefer SSE; fall back to polling if the stream can't be opened.
        streamBatch(batch.id).catch(() => pollBatch(batch.id));
      } catch (err) {
        stopWatching();
        activeRef.current = false;
        setActive(null);
        throw err;
      }
    },
    [finish, stopWatching, streamBatch, pollBatch],
  );

  const clearLastCompleted = useCallback(() => setLastCompleted(null), []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return (
    <GenerationContext.Provider value={{ active, lastCompleted, start, clearLastCompleted }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return ctx;
}
