import { GenerationStatus } from "@/types/generation";

export const statusProgressMap: Record<GenerationStatus, number> = {
  idle: 0,
  queued: 5,
  analyzing_prompt: 15,
  planning_layout: 30,
  generating_schema: 45,
  generating_code: 65,
  validating: 78,
  building_preview: 90,
  completed: 100,
  failed: 100,
  cancelled: 0,
};

export const statusLabelMap: Record<GenerationStatus, string> = {
  idle: "Idle",
  queued: "Queued in generation backlog...",
  analyzing_prompt: "Analyzing prompt query structure...",
  planning_layout: "Planning dashboard grid layout...",
  generating_schema: "Compiling semantic JSON schema...",
  generating_code: "Synthesizing React & TypeScript files...",
  validating: "Validating generated layout components...",
  building_preview: "Building interactive layout preview...",
  completed: "Generation successfully completed!",
  failed: "Generation failed. Please try again.",
  cancelled: "Generation task cancelled.",
};
