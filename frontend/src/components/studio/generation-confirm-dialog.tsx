"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GenerationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  themeName: string;
  creditsBalance: number;
  boostPrompt: boolean;
  onBoostPromptChange: (checked: boolean) => void;
  onConfirm: () => void;
  pageCount: number;
  /** When true, the AI decides the page set; the count is shown as "Auto". */
  auto?: boolean;
}

export function GenerationConfirmDialog({
  open,
  onOpenChange,
  prompt,
  themeName,
  creditsBalance,
  boostPrompt,
  onBoostPromptChange,
  onConfirm,
  pageCount,
  auto = false,
}: GenerationConfirmDialogProps) {
  // Generation costs 1 credit PER generated screen (the backend charges per page).
  // For Auto the screen count isn't known yet, so we require at least 1 and label
  // it as per-screen; for an explicit count we quote and gate on that exact number.
  const minNeeded = auto ? 1 : Math.max(1, pageCount);
  const costLabel = auto ? "1 credit / screen" : `${minNeeded} credit${minNeeded > 1 ? "s" : ""}`;
  const notEnough = creditsBalance < minNeeded;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Generation</DialogTitle>
          <DialogDescription className="text-xs leading-5">
            Launching the compilation engine will consume credits from your active workspace balance.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your prompt</p>
            <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-5 text-foreground">{prompt}</p>
          </div>

          <dl className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Theme preset</dt>
              <dd className="font-medium text-foreground">{themeName}</dd>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Pages to generate</dt>
              <dd className="font-medium text-foreground">{auto ? "Auto (AI decides)" : `${pageCount} page${pageCount > 1 ? "s" : ""}`}</dd>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-4 border-t border-border pt-2.5">
              <dt className="text-muted-foreground">Generation cost</dt>
              <dd className="font-semibold text-planetary">{costLabel}</dd>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Wallet balance</dt>
              <dd className="font-medium tabular-nums text-foreground">{creditsBalance} credit{creditsBalance > 1 ? "s" : ""}</dd>
            </div>
          </dl>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-sky/30 p-3 transition-colors hover:bg-sky/40">
            <input
              checked={boostPrompt}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-primary"
              onChange={(event) => onBoostPromptChange(event.target.checked)}
              type="checkbox"
              id="prompt-boost-toggle"
            />

            <span>
              <span className="block text-sm font-semibold text-foreground">Prompt Boosting</span>
              <span className="mt-0.5 block text-xs font-medium leading-4 text-muted-foreground">
                Analyze and improve layout brief definitions before running generation engines.
              </span>
            </span>
          </label>

          <p className="px-1 text-xs font-medium leading-5 text-muted-foreground">
            Generation cannot be paused once started. Layout saves are committed to version history automatically.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button onClick={onConfirm} disabled={notEnough}>
              {notEnough ? "Not enough credits" : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
