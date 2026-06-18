import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { InterfaceTokenSync } from "@/components/app/interface-token-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getCurrentUser } from "@/lib/api/auth";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  variant = "app",
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  variant?: "app" | "admin";
}) {
  const currentUser = getCurrentUser();
  const user = currentUser
    ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
    : { name: "Account", email: "", role: "" };

  return (
    <SidebarProvider className="app-interface">
      <InterfaceTokenSync selector=".app-interface" />
      <AppSidebar
        variant={variant}
        user={user}
      />
      <SidebarInset className="bg-background">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background)_0%,color-mix(in_oklch,var(--background)_82%,var(--muted))_100%)]">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
