import type { ReactNode } from "react";

import { AppShell as ProductionAppShell } from "@/components/app/app-shell";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <ProductionAppShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </ProductionAppShell>
  );
}
