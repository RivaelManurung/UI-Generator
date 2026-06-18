"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjects } from "@/hooks/use-projects";
import { generationService, type GeneratedPage } from "@/lib/services/generation-service";
import { freeTemplateService } from "@/lib/services/free-template-service";
import type { AdminFreeTemplate } from "@/types/free-template";

export default function AdminFreeTemplatesPage() {
  const [items, setItems] = useState<AdminFreeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    freeTemplateService
      .adminList()
      .then(setItems)
      .catch(() => toast.error("Failed to load free templates"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublished(t: AdminFreeTemplate) {
    try {
      const updated = await freeTemplateService.update(t.id, { published: !t.published });
      setItems((cur) => cur.map((x) => (x.id === t.id ? updated : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function remove(t: AdminFreeTemplate) {
    if (!window.confirm(`Delete free template "${t.title}"? This cannot be undone.`)) return;
    try {
      await freeTemplateService.remove(t.id);
      setItems((cur) => cur.filter((x) => x.id !== t.id));
      toast.success("Free template deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <AdminShell
      title="Free Templates"
      subtitle="Publish generated pages as free, downloadable templates on the public site."
      actions={
        <Button size="sm" onClick={() => setPublishOpen(true)}>
          <Plus className="h-4 w-4" />
          Publish template
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No free templates yet</p>
              <p className="text-sm text-muted-foreground">
                Publish a generated page to make it available for free download.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Page type</TableHead>
                    <TableHead className="text-right">Downloads</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{t.title}</div>
                        <div className="text-xs text-muted-foreground">/{t.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {t.category || t.pageType}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{t.pageType}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.downloads}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.published}
                            onCheckedChange={() => togglePublished(t)}
                            aria-label={`Toggle publish for ${t.title}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {t.published ? "Public" : "Hidden"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" aria-label="Open public page">
                            <a href="/templates" target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(t)}
                            aria-label={`Delete ${t.title}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onPublished={() => {
          setPublishOpen(false);
          load();
        }}
      />
    </AdminShell>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState("");
  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setPages([]);
      setPageId("");
      return;
    }
    let cancelled = false;
    generationService
      .getProjectPages(projectId)
      .then((ps) => {
        if (!cancelled) setPages(ps);
      })
      .catch(() => {
        if (!cancelled) setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const page = pages.find((p) => p.id === pageId);
    if (page) setTitle((prev) => prev || page.name);
  }, [pageId, pages]);

  async function submit() {
    if (!pageId || !title.trim()) {
      toast.error("Pick a page and enter a title");
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
      setProjectId("");
      setPageId("");
      setTitle("");
      setDescription("");
      setCategory("");
      onPublished();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Publish free template</DialogTitle>
          <DialogDescription>
            Pick a generated page to snapshot and publish as a free, downloadable template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Page</Label>
            <Select value={pageId} onValueChange={setPageId} disabled={pages.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !projectId
                      ? "Select a project first"
                      : pages.length === 0
                        ? "No generated pages"
                        : "Select a page"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.pageType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ft-title">Title</Label>
            <Input
              id="ft-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="MasjidCare — Financial Reports"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ft-category">
              Category <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ft-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="dashboard"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ft-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ft-desc"
              className="min-h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary shown on the card."
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !pageId || !title.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
