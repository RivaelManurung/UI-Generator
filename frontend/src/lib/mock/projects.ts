import { Project } from "@/types/project";

export const initialProjects: Project[] = [
  {
    id: "demo",
    name: "Hospital Ops Dashboard",
    description: "Operational command center for appointments, patient flow, and doctors.",
    status: "active",
    defaultThemeSlug: "medical-clean",
    pagesCount: 4,
    qualityAverage: 92,
    updatedAt: "Jun 7, 2026",
    createdAt: "Jun 1, 2026",
  },
  {
    id: "finance",
    name: "Finance Command Center",
    description: "Revenue, invoices, accounts, and cash-flow analytics workspace.",
    status: "draft",
    defaultThemeSlug: "jakarta",
    pagesCount: 2,
    qualityAverage: 88,
    updatedAt: "Jun 6, 2026",
    createdAt: "Jun 2, 2026",
  },
  {
    id: "inventory",
    name: "Inventory Control",
    description: "Stock movement, suppliers, warehouse alerts, and SKU monitoring.",
    status: "active",
    defaultThemeSlug: "bandung",
    pagesCount: 6,
    qualityAverage: 94,
    updatedAt: "Jun 4, 2026",
    createdAt: "May 25, 2026",
  },
  {
    id: "school",
    name: "School Attendance Hub",
    description: "Attendance, class schedules, teacher workload, and parent follow-up.",
    status: "active",
    defaultThemeSlug: "jakarta-lite",
    pagesCount: 3,
    qualityAverage: 90,
    updatedAt: "Jun 3, 2026",
    createdAt: "May 28, 2026",
  },
];

// Global in-memory persistence for live mock changes
let mockProjectsStore: Project[] = [...initialProjects];

export function getMockProjects(): Project[] {
  return mockProjectsStore;
}

export function saveMockProject(project: Project) {
  const index = mockProjectsStore.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    mockProjectsStore[index] = { ...project, updatedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) };
  } else {
    mockProjectsStore.push(project);
  }
}

export function deleteMockProject(id: string) {
  mockProjectsStore = mockProjectsStore.filter((p) => p.id !== id);
}
