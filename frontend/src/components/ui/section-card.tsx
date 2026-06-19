import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/90 bg-card shadow-[0_1px_2px_rgba(8,31,92,0.06),0_12px_30px_rgba(8,31,92,0.05)] ring-1 ring-galaxy/[0.04]",
        "before:pointer-events-none before:block before:h-px before:w-full before:bg-gradient-to-r before:from-transparent before:via-galaxy/15 before:to-transparent",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pb-3 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-bold tracking-normal text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
