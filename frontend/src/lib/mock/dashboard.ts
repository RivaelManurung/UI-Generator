import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FolderKanban,
  History,
  Layers3,
  Palette,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: LucideIcon;
  progress: number;
};

export type ActivityStatus = "generated" | "refined" | "refunded" | "validated";

export type ActivityItem = {
  id: string;
  title: string;
  project: string;
  time: string;
  status: ActivityStatus;
  credits: number;
};

export type RecentProject = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  versions: number;
  status: "active" | "draft" | "review";
};

export type WalletLedgerItem = {
  id: string;
  label: string;
  time: string;
  amount: number;
};

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardStats: DashboardStat[] = [
  {
    label: "Projects",
    value: "8",
    detail: "3 active workspaces",
    trend: "+2 this week",
    icon: FolderKanban,
    progress: 68,
  },
  {
    label: "Credits",
    value: "312",
    detail: "188 available this cycle",
    trend: "62% remaining",
    icon: CreditCard,
    progress: 62,
  },
  {
    label: "Versions",
    value: "47",
    detail: "Generated and retained",
    trend: "+11 generated",
    icon: History,
    progress: 74,
  },
  {
    label: "Validations",
    value: "98%",
    detail: "Schema pass rate",
    trend: "4 refunds avoided",
    icon: ShieldCheck,
    progress: 98,
  },
];

export const activityItems: ActivityItem[] = [
  {
    id: "act-1",
    title: "Generated executive KPI page",
    project: "Hospital Ops Dashboard",
    time: "12 minutes ago",
    status: "generated",
    credits: -2,
  },
  {
    id: "act-2",
    title: "Refined revenue trend section",
    project: "Finance Command Center",
    time: "36 minutes ago",
    status: "refined",
    credits: -1,
  },
  {
    id: "act-3",
    title: "Validated schema contract",
    project: "SaaS Metrics Board",
    time: "1 hour ago",
    status: "validated",
    credits: 0,
  },
  {
    id: "act-4",
    title: "Refunded failed chart mapping",
    project: "Marketplace Analytics",
    time: "Yesterday",
    status: "refunded",
    credits: 1,
  },
];

export const recentProjects: RecentProject[] = [
  {
    id: "demo",
    name: "Hospital Ops Dashboard",
    type: "Operations",
    updatedAt: "Today, 10:42",
    versions: 12,
    status: "active",
  },
  {
    id: "finance",
    name: "Finance Command Center",
    type: "Finance",
    updatedAt: "Today, 09:18",
    versions: 9,
    status: "review",
  },
  {
    id: "saas",
    name: "SaaS Metrics Board",
    type: "Product",
    updatedAt: "Yesterday",
    versions: 18,
    status: "active",
  },
  {
    id: "marketplace",
    name: "Marketplace Analytics",
    type: "Growth",
    updatedAt: "Jun 5",
    versions: 8,
    status: "draft",
  },
];

export const walletLedger: WalletLedgerItem[] = [
  { id: "led-1", label: "Executive KPI page", time: "12m ago", amount: -2 },
  { id: "led-2", label: "Revenue trend refinement", time: "36m ago", amount: -1 },
  { id: "led-3", label: "Chart mapping refund", time: "Yesterday", amount: 1 },
];

export const quickActions: QuickAction[] = [
  {
    title: "New generation",
    description: "Create a page from prompt or schema.",
    href: "/app/studio/demo",
    icon: Layers3,
  },
  {
    title: "Open projects",
    description: "Review versions and project health.",
    href: "/app/projects",
    icon: Layers3,
  },
  {
    title: "Theme library",
    description: "Browse production-ready templates.",
    href: "/app/templates",
    icon: Palette,
  },
  {
    title: "Billing events",
    description: "Inspect credit usage and refunds.",
    href: "/app/billing",
    icon: BarChart3,
  },
];

export const dashboardActivityIcons: Record<ActivityStatus, LucideIcon> = {
  generated: Layers3,
  refined: RefreshCw,
  refunded: CreditCard,
  validated: CheckCircle2,
};

export const workspaceHealth = [
  { label: "Renderer coverage", value: 88, icon: Activity },
  { label: "Schema readiness", value: 94, icon: CheckCircle2 },
  { label: "Template reuse", value: 71, icon: Layers3 },
];
