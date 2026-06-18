export interface ThemeOption {
  value: string;
  label: string;
  cost: number;
  description: string;
}

export const themeOptions: ThemeOption[] = [
  {
    value: "jakarta-lite",
    label: "Jakarta Lite",
    cost: 1,
    description: "Clean neutral dashboard style for fast generation.",
  },
  {
    value: "jakarta",
    label: "Jakarta",
    cost: 3,
    description: "More polished layout with stronger visual hierarchy.",
  },
  {
    value: "minimal",
    label: "Minimal",
    cost: 1,
    description: "Plain shadcn-style interface with restrained visuals.",
  },
  {
    value: "bandung",
    label: "Bandung",
    cost: 3,
    description: "Warmer layout direction for operational dashboards.",
  },
];
