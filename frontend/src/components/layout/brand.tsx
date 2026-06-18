import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  className,
  withWordmark = true,
}: {
  href?: string;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <LayoutDashboard className="size-5" />
      </span>
      {withWordmark && (
        <span className="text-base font-semibold tracking-tight">
          DashboardCraft
        </span>
      )}
    </Link>
  );
}
