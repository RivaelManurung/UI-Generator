export type ProjectStatus = "active" | "draft" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: ProjectStatus;
  defaultThemeSlug: string;
  pagesCount: number;
  qualityAverage: number;
  updatedAt: string;
  createdAt?: string;
}
