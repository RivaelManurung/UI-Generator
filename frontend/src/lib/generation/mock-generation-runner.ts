import { GenerationStatus } from "@/types/generation";
import { statusProgressMap } from "./status";
import { generationService } from "@/lib/services/generation-service";

export interface GenerationRunnerOptions {
  projectId: string;
  prompt: string;
  themeSlug: string;
  onStateChange: (status: GenerationStatus, progress: number) => void;
  onComplete: (version: any) => void;
  onFail: (error: string) => void;
}

export function startMockGeneration(options: GenerationRunnerOptions) {
  const phases: GenerationStatus[] = [
    "queued",
    "analyzing_prompt",
    "planning_layout",
    "generating_schema",
    "generating_code",
    "validating",
    "building_preview",
  ];

  let currentPhaseIndex = 0;
  let isCancelled = false;
  let timerId: NodeJS.Timeout | null = null;

  const runPhase = async () => {
    if (isCancelled) return;

    if (currentPhaseIndex < phases.length) {
      const status = phases[currentPhaseIndex];
      const progress = statusProgressMap[status];
      options.onStateChange(status, progress);

      currentPhaseIndex++;
      // Randomize phase duration between 200ms and 500ms
      const nextDelay = Math.floor(Math.random() * 300) + 200;
      timerId = setTimeout(runPhase, nextDelay);
    } else {
      try {
        // Compile version dynamically via service
        const version = await generationService.compileGenerationVersion(
          options.projectId,
          options.prompt,
          options.themeSlug
        );
        options.onStateChange("completed", 100);
        options.onComplete(version);
      } catch (err: any) {
        options.onStateChange("failed", 100);
        options.onFail(err?.message ?? "Code generation failed");
      }
    }
  };

  // Launch initial queued phase
  runPhase();

  return {
    cancel: () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      options.onStateChange("cancelled", 0);
    },
  };
}
