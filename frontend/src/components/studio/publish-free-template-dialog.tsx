"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { freeTemplateService } from "@/lib/services/free-template-service";

// Admin-only: publish the currently selected studio screen as a public free template.
export function PublishFreeTemplateDialog({
  open,
  onOpenChange,
  pageId,
  defaultTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string | null;
  defaultTitle: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);

  async function submit() {
    if (!pageId || !title.trim()) {
      toast.error("A title is required");
      return;
    }
    setSubmitting(true);
    try {
      await freeTemplateService.publish({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        sourcePageId: pageId,
      });
      toast.success("Published as a free template");
      setDescription("");
      setCategory("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Publish as Free Template</DialogTitle>
          <DialogDescription className="text-xs">
            Snapshot this screen and publish it as a free, downloadable template on the public site.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pub-title">Title</Label>
            <Input id="pub-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pub-category">
              Category <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="pub-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="dashboard"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pub-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="pub-desc"
              className="min-h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary shown on the card."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !title.trim() || !pageId}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
