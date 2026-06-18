import { http } from "@/lib/api/http";

export interface Template {
  id: string;
  name: string;
  domain: string;
  pageType: string;
  componentHint: number;
  tier: "Free" | "Premium";
  description: string;
}

export async function getTemplates(): Promise<Template[]> {
  return (await http.get<{ templates: Template[] }>("/templates")).templates;
}
