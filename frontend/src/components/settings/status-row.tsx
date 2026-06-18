import * as React from "react";

interface StatusRowProps {
  label: string;
  value: string;
}

export function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
