export type ProjectStatus = "active" | "draft" | "archived";

/** Generation target: a desktop-first website or a native-feel mobile app. */
export type ProjectPlatform = "web" | "mobile";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  defaultThemeSlug: string;
  /** "web" (default) or "mobile" — branches the generated layout + preview shell. */
  platform?: ProjectPlatform;
  pagesCount: number;
  qualityAverage: number;
  updatedAt: string;
  createdAt?: string;
}
