"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PromptInputBoxProps {
  prompt: string;
  onChangePrompt: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
  selectedThemeName: string;
  onOpenThemePicker: () => void;
  pageCount: number;
  onChangePageCount: (count: number) => void;
  /** Auto = let the AI decide how many pages and which types fit the brief. */
  auto: boolean;
  onChangeAuto: (auto: boolean) => void;
}

const PAGE_COUNT_OPTIONS = [1, 2, 3, 4];

export function PromptInputBox({
  prompt,
  onChangePrompt,
  onSubmit,
  isGenerating,
  selectedThemeName,
  onOpenThemePicker,
  pageCount,
  onChangePageCount,
  auto,
  onChangeAuto,
}: PromptInputBoxProps) {
  const promptLength = prompt.trim().length;
  const isLengthValid = promptLength >= 40;
  const canGenerate = isLengthValid && !isGenerating;

  return (
    <form className="border-t border-border bg-card p-3" onSubmit={onSubmit}>
      <LabelForTextarea />
      <Textarea
        id="prompt-input"
        className="min-h-[78px] max-h-[180px] resize-none overflow-y-auto text-xs rounded-xl border-border bg-background text-foreground shadow-sm placeholder:text-muted-foreground"
        onChange={(event) => onChangePrompt(event.target.value)}
        placeholder="Describe what kind of webpage layout you want to generate. Minimum 40 characters..."
        value={prompt}
        disabled={isGenerating}
      />

      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold">
        <span className={isLengthValid ? "text-foreground" : "text-muted-foreground"}>
          {isLengthValid ? "Good description length" : "Min 40 characters required"}
        </span>

        <span className={isLengthValid ? "text-foreground font-mono" : "text-muted-foreground font-mono"}>
          {promptLength}/40
        </span>
      </div>

      <button
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold transition hover:bg-muted"
        onClick={onOpenThemePicker}
        type="button"
        aria-label="Open theme customization sheet"
        disabled={isGenerating}
      >
        <span className="text-foreground">Theme: {selectedThemeName}</span>
        <span className="font-bold text-primary">1 credit / page</span>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-normal text-muted-foreground">
          Pages: {auto ? "Auto" : pageCount}
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Number of pages to generate">
          <Button
            type="button"
            size="sm"
            variant={auto ? "default" : "outline"}
            className="h-7 px-2.5 text-xs font-bold"
            disabled={isGenerating}
            aria-label="Let AI choose the number of pages automatically"
            aria-pressed={auto}
            onClick={() => onChangeAuto(true)}
          >
            Auto
          </Button>
          {PAGE_COUNT_OPTIONS.map((count) => (
            <Button
              key={count}
              type="button"
              size="icon"
              variant={!auto && pageCount === count ? "default" : "outline"}
              className="h-7 w-7 text-xs font-bold"
              disabled={isGenerating}
              aria-label={`Generate ${count} page${count > 1 ? "s" : ""}`}
              aria-pressed={!auto && pageCount === count}
              onClick={() => {
                onChangeAuto(false);
                onChangePageCount(count);
              }}
            >
              {count}
            </Button>
          ))}
        </div>
      </div>

      <Button
        className="mt-3 w-full font-bold text-xs"
        disabled={!canGenerate}
        type="submit"
        aria-label="Submit generation prompt"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            Generating...
          </>
        ) : (
          "Generate"
        )}
      </Button>
    </form>
  );
}

function LabelForTextarea() {
  return (
    <label htmlFor="prompt-input" className="sr-only">
      Dashboard Generation Prompt Description Input
    </label>
  );
}
