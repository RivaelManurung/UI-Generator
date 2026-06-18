import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  active: "border-success-border bg-success-bg text-success-foreground",
  draft: "border-warning-border bg-warning-bg text-warning-foreground",
  review: "border-info-border bg-info-bg text-info-foreground",
  generated: "border-success-border bg-success-bg text-success-foreground",
  refined: "border-info-border bg-info-bg text-info-foreground",
  refunded: "border-info-border bg-info-bg text-info-foreground",
  validated: "border-info-border bg-info-bg text-info-foreground",
} as const;

export type StatusBadgeKind = keyof typeof statusStyles;

export function StatusBadge({
  status,
  className,
}: {
  status: StatusBadgeKind;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusStyles[status], className)}>
      {status}
    </Badge>
  );
}
