"use client";

import { Monitor, Loader2, Cpu, Terminal, Compass, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPreviewProps {
  isGenerating: boolean;
  onSelectExample: () => void;
  selectedThemeName: string;
}

export function EmptyPreview({
  isGenerating,
  onSelectExample,
  selectedThemeName,
}: EmptyPreviewProps) {
  return (
    <div className="grid h-[calc(100vh-8.5rem)] min-h-[620px] place-items-center rounded-xl border border-border bg-card text-card-foreground p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-muted text-muted-foreground">
          {isGenerating ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
            <Layout className="h-7 w-7" />
          )}
        </div>

        <h2 className="mt-6 text-xl font-bold">
          {isGenerating ? "Synthesizing Layout..." : "Your Studio Canvas is Ready"}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground leading-6 font-medium">
          {isGenerating
            ? "Building layout structures, compiling schema definitions, and preparing preview components."
            : "Enter a detailed prompt in the left sidebar to generate a responsive admin dashboard or template page."}
        </p>

        {!isGenerating && (
          <div className="mt-8 rounded-xl border border-border bg-muted/20 p-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Compass className="h-4 w-4" /> Quick onboarding checklist
            </h3>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium">
              <li className="flex items-start gap-2">
                <span className="text-foreground font-bold">1.</span>
                <span>Select a preset prompt example or write a custom description (minimum 40 characters).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground font-bold">2.</span>
                <span>Choose a theme (currently: <strong>{selectedThemeName}</strong>). Generation costs 1 credit per page.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground font-bold">3.</span>
                <span>Confirm generation to run compile engines.</span>
              </li>
            </ul>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full text-xs font-bold"
              onClick={onSelectExample}
              aria-label="Use example prompt checklist shortcut"
            >
              Load an Example
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
