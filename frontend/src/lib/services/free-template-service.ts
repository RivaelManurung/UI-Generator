import { http } from "@/lib/api/http";
import type {
  FreeTemplate,
  FreeTemplateDetail,
  AdminFreeTemplate,
  PublishFreeTemplateInput,
  UpdateFreeTemplateInput,
} from "@/types/free-template";

export const freeTemplateService = {
  // ---- Public ----
  listPublic: (): Promise<FreeTemplate[]> => http.get<FreeTemplate[]>("/free-templates"),
  getBySlug: (slug: string): Promise<FreeTemplateDetail> =>
    http.get<FreeTemplateDetail>(`/free-templates/${slug}`),
  incrementDownload: (slug: string): Promise<{ success: boolean }> =>
    http.post<{ success: boolean }>(`/free-templates/${slug}/download`),

  // ---- Admin ----
  adminList: (): Promise<AdminFreeTemplate[]> => http.get<AdminFreeTemplate[]>("/admin/free-templates"),
  publish: (input: PublishFreeTemplateInput): Promise<AdminFreeTemplate> =>
    http.post<AdminFreeTemplate>("/admin/free-templates", input),
  update: (id: string, input: UpdateFreeTemplateInput): Promise<AdminFreeTemplate> =>
    http.patch<AdminFreeTemplate>(`/admin/free-templates/${id}`, input),
  remove: (id: string): Promise<{ success: boolean }> =>
    http.delete<{ success: boolean }>(`/admin/free-templates/${id}`),
};
