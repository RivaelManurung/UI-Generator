export interface Theme {
  slug: string;
  name: string;
  cost: number;
  status?: "available" | "soon";
  previewClass: string;
  description: string;
}

// A theme is the dashboard UI kit the generated code targets. The slug must
// match a backend theme slug so generation renders code for that library.
export const themes: Theme[] = [
  {
    slug: "shadcn",
    name: "shadcn/ui",
    cost: 1,
    status: "available",
    previewClass: "bg-card border-border",
    description: "Radix primitives + Tailwind. Clean, neutral, accessible.",
  },
  {
    slug: "reui",
    name: "ReUI",
    cost: 1,
    status: "available",
    previewClass: "bg-accent/40 border-border",
    description: "Tailwind components on Radix with expressive styling.",
  },
  {
    slug: "antd",
    name: "Ant Design",
    cost: 1,
    status: "available",
    previewClass: "bg-[#e6f4ff] border-[#91caff]",
    description: "Enterprise component system imported from antd.",
  },
  {
    slug: "mui",
    name: "Material UI",
    cost: 1,
    status: "available",
    previewClass: "bg-[#e3f2fd] border-[#90caf9]",
    description: "Material Design via @mui/material.",
  },
  {
    slug: "chakra",
    name: "Chakra UI",
    cost: 1,
    status: "available",
    previewClass: "bg-[#e6fffa] border-[#81e6d9]",
    description: "Composable, themeable components from @chakra-ui/react.",
  },
];
