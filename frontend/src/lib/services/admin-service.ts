import { http } from "@/lib/api/http";
import type { AdminUser, GenerationJob } from "@/lib/api/types";

export type AnalyticsKpis = {
  activeUsers: number;
  generationJobs: number;
  successRate: number;
  avgQuality: number;
};

export type AnalyticsPoint = {
  label: string;
  value: number;
};

export type AdminProject = {
  id: string;
  name: string;
  status: "active" | "draft" | "archived";
  owner: string;
  ownerEmail: string;
  pagesCount: number;
  qualityAverage: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTemplate = {
  id: string;
  name: string;
  domain: string;
  pageType: string;
  componentHint: number;
  tier: "Free" | "Premium";
  description: string;
};

export type AdminTemplateInput = Omit<AdminTemplate, "id"> & { id?: string };

export type ThemeLibrary = "shadcn" | "reui" | "antd" | "mui" | "chakra";

export const THEME_LIBRARIES: { value: ThemeLibrary; label: string }[] = [
  { value: "shadcn", label: "shadcn/ui" },
  { value: "reui", label: "ReUI" },
  { value: "antd", label: "Ant Design" },
  { value: "mui", label: "Material UI" },
  { value: "chakra", label: "Chakra UI" },
];

export type AdminTheme = {
  slug: string;
  name: string;
  accent: string;
  library: ThemeLibrary;
  description: string;
};

export type AdminThemeInput = {
  slug?: string;
  name: string;
  accent: string;
  library: ThemeLibrary;
  description: string;
};

export type AdminUserUpdate = {
  role?: "user" | "admin";
  status?: "active" | "review" | "suspended";
  credits?: number;
};

// ---- Per-user 360° admin view (mirrors backend services/admin_user.go DTOs) ----

export type AdminUserOverview = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  walletBalance: number;
  projects: number;
  pages: number;
  generations: number;
  totalToppedUpIdr: number;
  totalCreditsPurchased: number;
  totalCreditsConsumed: number;
};

export type AdminUserPayment = {
  orderId: string;
  packageSlug: string;
  amountIdr: number;
  credits: number;
  status: string;
  createdAt: string;
};

export type AdminUserTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  status: string;
  createdAt: string;
};

export type AdminBillingSummary = {
  totalBalance: number;
  creditsUsed: number;
  refundsIssued: number;
  topups: number;
};

export type AdminTransaction = {
  id: string;
  user: string;
  type: "usage" | "refund" | "topup" | "generation";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export const adminService = {
  // Users
  listUsers: () => http.get<AdminUser[]>("/admin/users"),
  updateUser: (id: string, patch: AdminUserUpdate) =>
    http.patch<AdminUser>(`/admin/users/${id}`, patch),
  deleteUser: (id: string) => http.delete<{ success: boolean }>(`/admin/users/${id}`),

  // Per-user 360° view
  getUserOverview: (id: string) =>
    http.get<AdminUserOverview>(`/admin/users/${id}/overview`),
  getUserPayments: (id: string) =>
    http.get<AdminUserPayment[]>(`/admin/users/${id}/payments`),
  getUserTransactions: (id: string) =>
    http.get<AdminUserTransaction[]>(`/admin/users/${id}/transactions`),
  getUserGenerations: (id: string) =>
    http.get<GenerationJob[]>(`/admin/users/${id}/generations`),
  getUserProjects: (id: string) =>
    http.get<AdminProject[]>(`/admin/users/${id}/projects`),

  // Projects
  listProjects: () => http.get<AdminProject[]>("/admin/projects"),
  deleteProject: (id: string) => http.delete<{ success: boolean }>(`/admin/projects/${id}`),

  // Generations
  listGenerationJobs: () => http.get<GenerationJob[]>("/admin/generation-jobs"),
  retryGeneration: (id: string) =>
    http.post<{ success: boolean }>(`/admin/generation-jobs/${id}/retry`),

  // Templates
  listTemplates: () => http.get<AdminTemplate[]>("/admin/templates"),
  createTemplate: (input: AdminTemplateInput) => http.post<AdminTemplate>("/admin/templates", input),
  updateTemplate: (id: string, input: AdminTemplateInput) =>
    http.put<AdminTemplate>(`/admin/templates/${id}`, input),
  deleteTemplate: (id: string) => http.delete<{ success: boolean }>(`/admin/templates/${id}`),

  // Themes
  listThemes: () => http.get<AdminTheme[]>("/admin/themes"),
  createTheme: (input: AdminThemeInput) => http.post<AdminTheme>("/admin/themes", input),
  updateTheme: (slug: string, input: AdminThemeInput) =>
    http.put<AdminTheme>(`/admin/themes/${slug}`, input),
  deleteTheme: (slug: string) => http.delete<{ success: boolean }>(`/admin/themes/${slug}`),

  // Billing
  billingSummary: () => http.get<AdminBillingSummary>("/admin/billing/summary"),
  transactions: () => http.get<AdminTransaction[]>("/admin/billing/transactions"),

  // Analytics
  analyticsKpis: () => http.get<AnalyticsKpis>("/admin/analytics/kpis"),
  analyticsFunnel: () => http.get<AnalyticsPoint[]>("/admin/analytics/generation-funnel"),
  analyticsCategories: () => http.get<AnalyticsPoint[]>("/admin/analytics/category-breakdown"),
};
