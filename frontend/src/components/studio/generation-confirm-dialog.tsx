"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your prompt:</p>
            <p className="mt-1 line-clamp-3 text-xs font-semibold text-foreground leading-5">{prompt}</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Theme preset</span>
              <span className="text-foreground">{themeName}</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Pages to generate</span>
              <span className="text-foreground">{auto ? "Auto (AI decides)" : `${pageCount} page${pageCount > 1 ? "s" : ""}`}</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Generation cost</span>
              <span className="text-primary">{costLabel}</span>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Wallet balance</span>
              <span className="text-foreground">{creditsBalance} credit{creditsBalance > 1 ? "s" : ""}</span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <input
              checked={boostPrompt}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              onChange={(event) => onBoostPromptChange(event.target.checked)}
              type="checkbox"
              id="prompt-boost-toggle"
            />

            <span>
              <span className="block text-xs font-bold text-foreground">Prompt Boosting</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 leading-4 font-medium">
                Analyze and improve layout brief definitions before running generation engines.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-[10px] font-semibold text-muted-foreground leading-4">
            Important: Generation cannot be paused once started. Layout saves are committed to version history automatically.
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button onClick={onConfirm} className="font-bold text-xs" disabled={notEnough}>
              {notEnough ? "Not enough credits" : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
