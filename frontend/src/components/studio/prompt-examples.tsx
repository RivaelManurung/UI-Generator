"use client";

import { ChartColumn, Users, Package, Box, LayoutDashboard } from "lucide-react";
import { examplePrompts } from "@/lib/constants/prompt-examples";

const iconMap = {
  ChartColumn,
  Users,
  Package,
  Box,
  LayoutDashboard,
};

interface PromptExamplesProps {
  onSelectPrompt: (promptText: string) => void;
}

export function PromptExamples({ onSelectPrompt }: PromptExamplesProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
        Recommended Preset Examples
      </p>

      <div className="grid gap-2">
        {examplePrompts.map((item) => {
          const Icon = iconMap[item.iconName];

          return (
            <button
              className="group w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={item.title}
              onClick={() => onSelectPrompt(item.prompt)}
              type="button"
              aria-label={`Load example prompt for ${item.title}`}
            >
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-card-foreground">{item.title}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
