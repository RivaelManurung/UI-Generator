export type GenerationStatus =
  | "idle"
  | "queued"
  | "analyzing_prompt"
  | "planning_layout"
  | "generating_schema"
  | "generating_code"
  | "validating"
  | "building_preview"
  | "completed"
  | "failed"
  | "cancelled";

export interface GenerationJob {
  id: string;
  projectId: string;
  page?: string; // Support for legacy view compatibility
  user?: string; // Support for legacy view compatibility
  duration?: string; // Support for legacy view compatibility
  prompt: string;
  status: GenerationStatus;
  progress: number;
  creditCost: number;
  qualityScore: number;
  errorMessage?: string;
  retryCount?: number;
  createdAt: string;
  completedAt?: string;
}

export interface GeneratedFile {
  path: string;
  language: "typescript" | "css" | "json";
  content: string;
  size?: number;
}

export interface MetricItem {
  label: string;
  value: string;
  trend?: string;
  icon?: string;
  image?: string;
  /** Optional mini trend series for a real sparkline on the stat card. */
  spark?: number[];
}

export interface SchemaField {
  label: string;
  type: string;
  hint?: string;
}

export interface SchemaTab {
  label: string;
  items: string[];
}

export interface SchemaSection {
  type: string;
  /** Grid width within the page: full | two-thirds | half | third. */
  span?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  items?: MetricItem[];
  chartType?: string;
  datasetPreset?: string;
  /** Real chart data: a single series, multiple series, or named series. */
  series?: number[][] | { name?: string; data?: number[] }[] | number[];
  /** Single-series chart data (convenience alias for one `series`). */
  data?: number[];
  /** X-axis category labels for charts. */
  categories?: string[];
  columns?: string[];
  rows?: string[][];
  actions?: string[];
  searchPlaceholder?: string;
  filters?: string[];
  primaryAction?: string;
  fields?: SchemaField[];
  submitLabel?: string;
  entity?: string;
  properties?: Record<string, string>;
  tabs?: SchemaTab[];
}

export interface PageSchema {
  pageType: string;
  domain: string;
  layout: string;
  theme: string;
  title: string;
  /** Product/app name shown in the nav (prompt-driven). */
  brand?: string;
  /** Product-specific primary menu, generated from the prompt (not canned). */
  nav?: string[];
  sections: SchemaSection[];
}

// Alias for backward references
export type DashboardSchema = PageSchema;

export interface GenerationVersion {
  id: string;
  versionNumber: number;
  prompt: string;
  qualityScore: number;
  createdAt: string;
  files: GeneratedFile[];
  schema: PageSchema;
}
