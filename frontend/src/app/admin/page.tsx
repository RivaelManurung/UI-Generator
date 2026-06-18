import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminDashboardPage() {
  return (
    <AdminShell
      title="Overview"
      subtitle="Operational view for generation jobs, usage, credits, and platform health."
    >
      <DashboardOverview />
    </AdminShell>
  );
}
