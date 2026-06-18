import type { PageSchema } from "@/types/generation";

export interface FreeTemplate {
  slug: string;
  title: string;
  description: string;
  pageType: string;
  category: string;
  designSystemSlug: string;
  brand: string;
  schema: PageSchema;
  downloads: number;
  published: boolean;
  createdAt: string;
}

export interface FreeTemplateDetail extends FreeTemplate {
  generatedCode: string;
}

export interface AdminFreeTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  pageType: string;
  category: string;
  published: boolean;
  downloads: number;
  createdAt: string;
}

export interface PublishFreeTemplateInput {
  title: string;
  description: string;
  category: string;
  sourcePageId: string;
}

export interface UpdateFreeTemplateInput {
  title?: string;
  description?: string;
  category?: string;
  published?: boolean;
}
