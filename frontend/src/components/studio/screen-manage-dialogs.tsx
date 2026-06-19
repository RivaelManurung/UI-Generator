"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  generationService,
  pollGenerationJob,
  type GeneratedPage,
} from "@/lib/services/generation-service";

export type ScreenManageKind = "rename" | "delete" | "regenerate";

interface ScreenManageDialogsProps {
  kind: ScreenManageKind | null;
  page: GeneratedPage | null;
  themeSlug: string;
  onClose: () => void;
  /** Refresh pages after a change; pass a slug to select it (rename changes the slug). */
  onDone: (selectSlug?: string) => void;
}

/**
 * Per-screen management dialogs (rename / delete / regenerate). Kept as one
 * controlled component so the studio shell only tracks a single `{kind, page}`
 * piece of state instead of three separate dialog toggles.
 */
export function ScreenManageDialogs({
  kind,
  page,
  themeSlug,
  onClose,
  onDone,
}: ScreenManageDialogsProps) {
  return (
    <>
      <RenameDialog open={kind === "rename"} page={page} onClose={onClose} onDone={onDone} />
      <DeleteDialog open={kind === "delete"} page={page} onClose={onClose} onDone={onDone} />
      <RegenerateDialog
        open={kind === "regenerate"}
        page={page}
        themeSlug={themeSlug}
        onClose={onClose}
        onDone={onDone}
      />
    </>
  );
}

function RenameDialog({
  open,
  page,
  onClose,
  onDone,
}: {
  open: boolean;
  page: GeneratedPage | null;
  onClose: () => void;
  onDone: (selectSlug?: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(page?.name ?? "");
  }, [open, page]);

  async function submit() {
    if (!page) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { slug } = await generationService.renamePage(page.id, trimmed, page.pageType);
      toast.success("Screen renamed");
      onDone(slug || undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename this screen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Rename screen</DialogTitle>
          <DialogDescription className="text-xs">
            Give this screen a clearer name. Its address (slug) updates to match.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-3"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Dashboard overview"
            aria-label="Screen name"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  page,
  onClose,
  onDone,
}: {
  open: boolean;
  page: GeneratedPage | null;
  onClose: () => void;
  onDone: (selectSlug?: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!page) return;
    setBusy(true);
    try {
      await generationService.deletePage(page.id);
      toast.success("Screen deleted");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this screen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle>Delete this screen?</DialogTitle>
          <DialogDescription className="text-xs">
            {page ? (
              <>
                <span className="font-semibold text-foreground">{page.name}</span> will be removed
                from this project. This cannot be undone from the studio.
              </>
            ) : (
              "This screen will be removed from the project."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={busy}
            aria-label="Confirm delete screen"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete screen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MIN_REGEN_PROMPT = 12;

function RegenerateDialog({
  open,
  page,
  themeSlug,
  onClose,
  onDone,
}: {
  open: boolean;
  page: GeneratedPage | null;
  themeSlug: string;
  onClose: () => void;
  onDone: (selectSlug?: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && page) {
      setPrompt(`Rebuild the ${page.pageType} screen "${page.name}" with a cleaner, richer layout.`);
    }
  }, [open, page]);

  async function submit() {
    if (!page) return;
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_REGEN_PROMPT) return;
    setBusy(true);
    try {
      const { jobId } = await generationService.regeneratePage(page.id, {
        prompt: trimmed,
        pageType: page.pageType,
        themeSlug,
      });
      const { status } = await pollGenerationJob(jobId);
      if (status === "succeeded") {
        toast.success("Screen regenerated");
        onDone(page.slug);
        onClose();
      } else if (status === "timeout") {
        toast.message("Still generating — this screen will update when it's ready.");
        onDone(page.slug);
        onClose();
      } else {
        toast.error("Regeneration did not complete. Your credit was not charged.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate this screen.");
    } finally {
      setBusy(false);
    }
  }

  const tooShort = prompt.trim().length < MIN_REGEN_PROMPT;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-[460px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Regenerate screen</DialogTitle>
          <DialogDescription className="text-xs">
            Rebuild just this screen from a new prompt. Costs{" "}
            <span className="font-semibold text-planetary">1 credit</span>.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-3"
        >
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-28 resize-none rounded-xl text-sm"
            placeholder="Describe how this screen should look…"
            aria-label="Regeneration prompt"
            disabled={busy}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || tooShort}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {busy ? "Regenerating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
