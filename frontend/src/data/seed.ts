import type { AdminUser, GenerationJob, Project, Template, Transaction } from "@/lib/api/types";

export const seedProjects: Project[] = [
  {
    id: "demo",
    name: "Hospital Ops Dashboard",
    description: "Operational command center for appointments, patient flow, and doctors.",
    domain: "Healthcare",
    status: "active",
    defaultThemeSlug: "medical-clean",
    pagesCount: 4,
    qualityAverage: 92,
    updatedAt: "Today, 22:10",
  },
  {
    id: "finance",
    name: "Finance Command Center",
    description: "Revenue, invoices, accounts, and cash-flow analytics workspace.",
    domain: "Finance",
    status: "draft",
    defaultThemeSlug: "precision-indigo",
    pagesCount: 2,
    qualityAverage: 88,
    updatedAt: "Yesterday, 18:42",
  },
  {
    id: "inventory",
    name: "Inventory Control",
    description: "Stock movement, suppliers, warehouse alerts, and SKU monitoring.",
    domain: "Inventory",
    status: "active",
    defaultThemeSlug: "emerald-grid",
    pagesCount: 6,
    qualityAverage: 94,
    updatedAt: "Jun 4, 2026",
  },
  {
    id: "school",
    name: "School Attendance Hub",
    description: "Attendance, class schedules, teacher workload, and parent follow-up.",
    domain: "Education",
    status: "active",
    defaultThemeSlug: "studio-neutral",
    pagesCount: 3,
    qualityAverage: 90,
    updatedAt: "Jun 3, 2026",
  },
];

export const seedTemplates: Template[] = [
  { id: "saas-analytics", title: "SaaS Analytics Dashboard", category: "SaaS", pageType: "dashboard", componentCount: 9, tier: "Free", description: "MRR, churn, activation, and usage overview." },
  { id: "hospital-ops", title: "Hospital Operations", category: "Healthcare", pageType: "dashboard", componentCount: 10, tier: "Free", description: "Appointments, doctors, departments, and patient flow." },
  { id: "school-attendance", title: "School Attendance", category: "Education", pageType: "list", componentCount: 7, tier: "Free", description: "Attendance table, filters, and class-level summaries." },
  { id: "inventory-control", title: "Inventory Control", category: "Inventory", pageType: "dashboard", componentCount: 8, tier: "Premium", description: "SKU health, stock movement, and supplier alerts." },
  { id: "finance-crm", title: "Finance CRM", category: "Finance", pageType: "detail", componentCount: 8, tier: "Premium", description: "Accounts, revenue pipeline, and payment status." },
  { id: "village-management", title: "Village Management", category: "Government", pageType: "dashboard", componentCount: 9, tier: "Free", description: "Citizen services, cases, budgets, and activity reports." },
  { id: "clinic-form", title: "Clinic Intake Form", category: "Healthcare", pageType: "form", componentCount: 6, tier: "Premium", description: "Patient registration, insurance fields, and action footer." },
  { id: "support-kanban", title: "Support Queue Board", category: "Operations", pageType: "dashboard", componentCount: 8, tier: "Free", description: "Tickets, service levels, priority lanes, and recent activity." },
];

export const seedTransactions: Transaction[] = [
  { id: "tx_001", date: "2026-06-05", type: "usage", amount: -1, balanceAfter: 42, reference: "Generated stock monitoring dashboard", status: "succeeded" },
  { id: "tx_002", date: "2026-06-05", type: "usage", amount: -1, balanceAfter: 41, reference: "Refined patient queue filters", status: "succeeded" },
  { id: "tx_003", date: "2026-06-04", type: "refund", amount: 1, balanceAfter: 42, reference: "Schema validation refund", status: "succeeded" },
  { id: "tx_004", date: "2026-06-03", type: "topup", amount: 25, balanceAfter: 41, reference: "Starter top-up", status: "succeeded" },
  { id: "tx_005", date: "2026-06-02", type: "usage", amount: -1, balanceAfter: 16, reference: "Generated finance overview", status: "succeeded" },
];

export const seedAdminUsers: AdminUser[] = [
  { id: "u_001", name: "Rivael Manurung", email: "rivael@example.com", role: "owner", credits: 42, projects: 8, pagesGenerated: 31, joinedAt: "2026-05-20", status: "active" },
  { id: "u_002", name: "Agency Demo", email: "agency@example.com", role: "user", credits: 14, projects: 3, pagesGenerated: 12, joinedAt: "2026-05-25", status: "active" },
  { id: "u_003", name: "Internal QA", email: "qa@example.com", role: "admin", credits: 99, projects: 12, pagesGenerated: 80, joinedAt: "2026-04-12", status: "review" },
  { id: "u_004", name: "Clinic Operator", email: "clinic@example.com", role: "user", credits: 8, projects: 2, pagesGenerated: 7, joinedAt: "2026-05-29", status: "active" },
  { id: "u_005", name: "Suspended Trial", email: "trial@example.com", role: "user", credits: 0, projects: 1, pagesGenerated: 2, joinedAt: "2026-06-01", status: "suspended" },
];

export const seedGenerationJobs: GenerationJob[] = [
  { id: "job_91a2", user: "Rivael", project: "Hospital Ops", page: "Overview", status: "succeeded", retryCount: 0, duration: "1.2s", createdAt: "22:10" },
  { id: "job_812b", user: "Agency Demo", project: "Inventory", page: "Stock List", status: "processing", retryCount: 0, duration: "0.8s", createdAt: "22:08" },
  { id: "job_77fa", user: "Internal QA", project: "Finance CRM", page: "Account Detail", status: "failed", retryCount: 2, duration: "3.1s", createdAt: "21:54", errorMessage: "Schema validation failed" },
  { id: "job_66ca", user: "Clinic Operator", project: "Clinic Intake", page: "Registration Form", status: "queued", retryCount: 0, duration: "-", createdAt: "21:49" },
  { id: "job_41bd", user: "Rivael", project: "School Hub", page: "Attendance List", status: "succeeded", retryCount: 1, duration: "1.6s", createdAt: "21:31" },
];
