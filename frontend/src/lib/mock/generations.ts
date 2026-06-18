import { GenerationVersion, PageSchema, GeneratedFile } from "@/types/generation";

export const initialSchema: PageSchema = {
  pageType: "dashboard",
  domain: "operations",
  layout: "sidebar",
  theme: "jakarta-lite",
  title: "Operations Control",
  sections: [
    {
      type: "statsGrid",
      title: "Overview",
      items: [
        { label: "Active Projects", value: "48", trend: "+12%", icon: "□" },
        { label: "Generations", value: "1,284", trend: "+8%", icon: "▦" },
        { label: "Success Rate", value: "97%", trend: "+1.4%", icon: "✓" },
        { label: "Avg Quality", value: "92", trend: "+3", icon: "★" },
      ],
    },
    {
      type: "chartPanel",
      title: "Generations over time",
      chartType: "bar",
      datasetPreset: "last-30-days",
    },
    {
      type: "dataTable",
      title: "Recent activity",
      columns: ["Project", "Status", "Quality", "Updated"],
      rows: [
        ["Logistics Hub", "Active", "94", "2h ago"],
        ["Sales Console", "Draft", "88", "4h ago"],
        ["Support Desk", "Active", "91", "1d ago"],
      ],
    },
  ],
};

export function buildGeneratedFiles(schema: PageSchema): GeneratedFile[] {
  return [
    {
      path: "app/page.tsx",
      language: "typescript",
      content: `import { sections } from "./schema";\n\nexport default function Page() {\n  return (\n    <main className="min-h-screen bg-background text-foreground">\n      <section className="mx-auto max-w-6xl p-6">\n        <h1 className="text-3xl font-bold">${schema.title}</h1>\n        <p className="mt-2 text-muted-foreground">${schema.pageType} · ${schema.domain}</p>\n        {/* ${schema.sections.length} sections rendered from the page schema */}\n      </section>\n    </main>\n  );\n}\n`,
    },
    {
      path: "app/schema.ts",
      language: "typescript",
      content: `export const schema = ${JSON.stringify(schema, null, 2)} as const;\n\nexport const sections = schema.sections;\n`,
    },
    {
      path: "schema/page.json",
      language: "json",
      content: JSON.stringify(schema, null, 2),
    },
  ];
}

// Map project IDs to their generated versions list
const mockVersionsStore: Record<string, GenerationVersion[]> = {
  demo: [
    {
      id: "v3",
      versionNumber: 3,
      prompt: "Add KPI overview, a generations chart, and a recent activity table.",
      qualityScore: 94,
      createdAt: "2 hours ago",
      schema: initialSchema,
      files: buildGeneratedFiles(initialSchema),
    },
    {
      id: "v2",
      versionNumber: 2,
      prompt: "Create initial operations dashboard layout.",
      qualityScore: 88,
      createdAt: "4 hours ago",
      schema: { ...initialSchema, title: "Operations Dashboard" },
      files: buildGeneratedFiles({ ...initialSchema, title: "Operations Dashboard" }),
    },
    {
      id: "v1",
      versionNumber: 1,
      prompt: "Seed simple skeleton workspace.",
      qualityScore: 72,
      createdAt: "1 day ago",
      schema: { ...initialSchema, sections: [] },
      files: buildGeneratedFiles({ ...initialSchema, sections: [] }),
    },
  ],
};

export function getMockVersions(projectId: string): GenerationVersion[] {
  return mockVersionsStore[projectId] ?? [];
}

export function addMockVersion(projectId: string, version: GenerationVersion) {
  if (!mockVersionsStore[projectId]) {
    mockVersionsStore[projectId] = [];
  }
  mockVersionsStore[projectId].unshift(version);
}
