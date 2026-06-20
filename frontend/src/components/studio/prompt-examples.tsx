"use client";

import { ChartColumn, Users, Package, Box, LayoutDashboard, Smartphone, MapPin, Heart, Wallet, ListChecks } from "lucide-react";
import { examplePrompts, type ExampleIcon } from "@/lib/constants/prompt-examples";

const iconMap: Record<ExampleIcon, typeof ChartColumn> = {
  ChartColumn,
  Users,
  Package,
  Box,
  LayoutDashboard,
  Smartphone,
  MapPin,
  Heart,
  Wallet,
  ListChecks,
};

interface PromptExamplesProps {
  onSelectPrompt: (promptText: string) => void;
  /** Show only presets for this target (mobile projects get mobile presets). */
  platform?: "web" | "mobile";
}

export function PromptExamples({ onSelectPrompt, platform = "web" }: PromptExamplesProps) {
  const presets = examplePrompts.filter((item) => item.platform === platform);
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
        {platform === "mobile" ? "Mobile App Presets" : "Website Presets"}
      </p>

      <div className="grid gap-2">
        {presets.map((item) => {
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
