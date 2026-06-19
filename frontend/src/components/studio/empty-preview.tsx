"use client";

import { Loader2, Compass, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

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
    <div className="grid h-[calc(100vh-8.5rem)] min-h-[620px] place-items-center rounded-xl border border-border bg-card p-6 text-card-foreground">
      <Reveal className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-sky/60 text-planetary">
          {isGenerating ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <Layout className="h-7 w-7" />
          )}
        </div>

        <h2 className="mt-6 text-xl font-bold text-foreground">
          {isGenerating ? "Synthesizing Layout..." : "Your Studio Canvas is Ready"}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          {isGenerating
            ? "Building layout structures, compiling schema definitions, and preparing preview components."
            : "Enter a detailed prompt in the left sidebar to generate a responsive admin dashboard or template page."}
        </p>

        {!isGenerating && (
          <div className="mt-8 rounded-xl border border-border bg-sky/20 p-4 text-left">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Compass className="h-4 w-4 text-planetary" /> Quick onboarding checklist
            </h3>
            <ul className="space-y-2.5 text-xs font-medium text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-planetary text-[10px] font-bold text-primary-foreground">1</span>
                <span>Select a preset prompt example or write a custom description (minimum 40 characters).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-planetary text-[10px] font-bold text-primary-foreground">2</span>
                <span>Choose a theme (currently: <strong className="font-semibold text-foreground">{selectedThemeName}</strong>). Generation costs 1 credit per page.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-planetary text-[10px] font-bold text-primary-foreground">3</span>
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
      </Reveal>
    </div>
  );
}
