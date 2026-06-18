import { seedAdminUsers, seedGenerationJobs, seedProjects, seedTemplates, seedTransactions } from "@/data/seed";

export const apiClient = {
  projects: async () => seedProjects,
  project: async (id: string) => seedProjects.find((project) => project.id === id) ?? seedProjects[0],
  templates: async () => seedTemplates,
  transactions: async () => seedTransactions,
  adminUsers: async () => seedAdminUsers,
  generationJobs: async () => seedGenerationJobs,
};
