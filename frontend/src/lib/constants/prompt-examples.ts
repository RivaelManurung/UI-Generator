export interface ExamplePrompt {
  title: string;
  description: string;
  iconName: "ChartColumn" | "Users" | "Package" | "Box" | "LayoutDashboard";
  prompt: string;
}

export const examplePrompts: ExamplePrompt[] = [
  {
    title: "Dashboard Overview",
    description: "Stats cards, charts, and transactions",
    iconName: "ChartColumn",
    prompt:
      "Create a professional dashboard overview for warehouse operations with stats cards, charts, recent activities, and transaction summary.",
  },
  {
    title: "User Management",
    description: "Data table with search and actions",
    iconName: "Users",
    prompt:
      "Create a user management page with searchable table, role filters, invite action, status badges, and user detail modal.",
  },
  {
    title: "Product Inventory",
    description: "Grid view with filters and modals",
    iconName: "Package",
    prompt:
      "Create an inventory management page with product grid, category tabs, stock indicators, filters, and product detail modal.",
  },
  {
    title: "Order Management",
    description: "Orders table with status details",
    iconName: "Box",
    prompt:
      "Create an order management page with order table, payment status, customer details, and shipment tracking panel.",
  },
  {
    title: "Analytics Dashboard",
    description: "Charts, date picker, and reports",
    iconName: "LayoutDashboard",
    prompt:
      "Create an analytics dashboard with date filters, revenue chart, conversion metrics, and downloadable reports.",
  },
];
