export type ExampleIcon =
  | "ChartColumn"
  | "Users"
  | "Package"
  | "Box"
  | "LayoutDashboard"
  | "Smartphone"
  | "MapPin"
  | "Heart"
  | "Wallet"
  | "ListChecks";

export interface ExamplePrompt {
  title: string;
  description: string;
  iconName: ExampleIcon;
  prompt: string;
  /** Which project target this preset is meant for. */
  platform: "web" | "mobile";
}

export const examplePrompts: ExamplePrompt[] = [
  // ---- Website presets ----
  {
    title: "Dashboard Overview",
    description: "Stats cards, charts, and transactions",
    iconName: "ChartColumn",
    platform: "web",
    prompt:
      "Create a professional dashboard overview for warehouse operations with stats cards, charts, recent activities, and transaction summary.",
  },
  {
    title: "User Management",
    description: "Data table with search and actions",
    iconName: "Users",
    platform: "web",
    prompt:
      "Create a user management page with searchable table, role filters, invite action, status badges, and user detail modal.",
  },
  {
    title: "Product Inventory",
    description: "Grid view with filters and modals",
    iconName: "Package",
    platform: "web",
    prompt:
      "Create an inventory management page with product grid, category tabs, stock indicators, filters, and product detail modal.",
  },
  {
    title: "Order Management",
    description: "Orders table with status details",
    iconName: "Box",
    platform: "web",
    prompt:
      "Create an order management page with order table, payment status, customer details, and shipment tracking panel.",
  },
  {
    title: "Analytics Dashboard",
    description: "Charts, date picker, and reports",
    iconName: "LayoutDashboard",
    platform: "web",
    prompt:
      "Create an analytics dashboard with date filters, revenue chart, conversion metrics, and downloadable reports.",
  },

  // ---- Mobile app presets ----
  {
    title: "Home Feed",
    description: "Greeting, balance, quick actions",
    iconName: "Smartphone",
    platform: "mobile",
    prompt:
      "Design a native mobile app home screen with a personalised greeting header, a hero balance card, a horizontal row of quick-action buttons, a scrollable activity list, and a bottom tab bar.",
  },
  {
    title: "Delivery Orders",
    description: "Active orders list + live map",
    iconName: "MapPin",
    platform: "mobile",
    prompt:
      "Design a native mobile delivery app screen with a list of active orders as tappable rows (status pill + ETA), a live map card, today's earnings, and a bottom tab bar with Home, Orders, Map, Profile.",
  },
  {
    title: "Fitness Tracker",
    description: "Activity rings, workouts, streaks",
    iconName: "Heart",
    platform: "mobile",
    prompt:
      "Design a native mobile fitness app screen with a large daily activity summary, a row of metric chips (steps, calories, heart rate), a list of recent workouts as rows, a streak card, and a bottom tab bar.",
  },
  {
    title: "Mobile Wallet",
    description: "Balance, cards, recent transactions",
    iconName: "Wallet",
    platform: "mobile",
    prompt:
      "Design a native mobile banking app screen with a balance hero card, a horizontal card carousel, quick transfer actions, a recent transactions list with merchant rows and amounts, and a bottom tab bar.",
  },
  {
    title: "Task List",
    description: "Grouped tasks, checkable rows, FAB",
    iconName: "ListChecks",
    platform: "mobile",
    prompt:
      "Design a native mobile to-do app screen with a large title header, grouped task sections (Today, Upcoming), checkable task rows with subtitles, a floating action button to add a task, and a bottom tab bar.",
  },
];
