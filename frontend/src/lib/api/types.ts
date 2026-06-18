export type Project = {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: "active" | "draft" | "archived";
  defaultThemeSlug: string;
  pagesCount: number;
  qualityAverage: number;
  updatedAt: string;
};

export type Template = {
  id: string;
  title: string;
  category: string;
  pageType: string;
  componentCount: number;
  tier: "Free" | "Premium";
  description: string;
};

export type Transaction = {
  id: string;
  date: string;
  type: "usage" | "refund" | "topup";
  amount: number;
  balanceAfter: number;
  reference: string;
  status: "succeeded" | "pending" | "failed";
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "owner";
  credits: number;
  projects: number;
  pagesGenerated: number;
  joinedAt: string;
  status: "active" | "review" | "suspended";
};

export type GenerationJob = {
  id: string;
  user: string;
  project: string;
  page: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  retryCount: number;
  duration: string;
  createdAt: string;
  errorMessage?: string;
};
