"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Palette, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { adminService, THEME_LIBRARIES } from "@/lib/services/admin-service";
import type {
  AdminTheme,
  AdminThemeInput,
  ThemeLibrary,
} from "@/lib/services/admin-service";

const DEFAULT_ACCENT = "#334eac";
const DEFAULT_LIBRARY: ThemeLibrary = "shadcn";

const PAGE_SIZE = 10;

function libraryLabel(library: ThemeLibrary): string {
  return THEME_LIBRARIES.find((item) => item.value === library)?.label ?? library;
}

type FormState = {
  slug: string;
  name: string;
  accent: string;
  library: ThemeLibrary;
  description: string;
};

function emptyForm(): FormState {
  return {
    slug: "",
    name: "",
    accent: DEFAULT_ACCENT,
    library: DEFAULT_LIBRARY,
    description: "",
  };
}

export default function AdminThemesPage() {
  const [themes, setThemes] = useState<AdminTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTheme | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminTheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.listThemes();
      setThemes(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = themes;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleIds = paged.map((theme) => theme.slug);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((slug) => selectedIds.has(slug));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((slug) => next.add(slug));
      else visibleIds.forEach((slug) => next.delete(slug));
      return next;
    });
  }

  function toggleOne(slug: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((slug) => adminService.deleteTheme(slug)),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) toast.success(`${succeeded} deleted`);
      if (failed > 0) toast.error(`${failed} failed`);
      setBulkOpen(false);
      setSelectedIds(new Set());
      await refetch();
    } finally {
      setBulkBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(theme: AdminTheme) {
    setEditing(theme);
    setForm({
      slug: theme.slug,
      name: theme.name,
      accent: theme.accent,
      library: theme.library,
      description: theme.description,
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const input: AdminThemeInput = {
          name: form.name.trim(),
          accent: form.accent,
          library: form.library,
          description: form.description.trim(),
        };
        await adminService.updateTheme(editing.slug, input);
        toast.success("Theme updated");
      } else {
        const input: AdminThemeInput = {
          name: form.name.trim(),
          accent: form.accent,
          library: form.library,
          description: form.description.trim(),
        };
        if (form.slug.trim()) {
          input.slug = form.slug.trim();
        }
        await adminService.createTheme(input);
        toast.success("Theme created");
      }
      setFormOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteTheme(deleteTarget.slug);
      toast.success("Theme deleted");
      setDeleteTarget(null);
      setSelectedIds(new Set());
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell
      title="Themes"
      subtitle="Manage dashboard UI kits available to generated interfaces."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          New theme
        </Button>
      }
    >
      <Reveal>
        <SectionCard>
          <SectionCardHeader
          title="Theme library"
          description="UI kits available to generated interfaces. Select rows for bulk actions."
          action={
            !loading && total > 0 ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-visible"
                  aria-label="Select all on this page"
                  checked={allVisibleSelected}
                  onCheckedChange={(value) => toggleAllVisible(value === true)}
                />
                <Label
                  htmlFor="select-all-visible"
                  className="cursor-pointer text-xs font-medium text-muted-foreground"
                >
                  Select page
                </Label>
              </div>
            ) : null
          }
        />

        {selectedIds.size > 0 ? (
          <div className="mx-5 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-planetary/25 bg-sky/30 px-4 py-2.5">
            <span className="text-sm font-semibold tabular-nums text-galaxy">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Separator orientation="vertical" className="h-5 bg-planetary/20" />
            <Button variant="destructive" size="sm" onClick={() => setBulkOpen(true)}>
              Delete selected
            </Button>
          </div>
        ) : null}

        <div className="px-5 pb-5">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : themes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-planetary/25 bg-sky/20 px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-planetary/10 text-planetary">
                <Palette className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-bold text-galaxy">No themes yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first UI kit to make it available to generated interfaces.
                </p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                New theme
              </Button>
            </div>
          ) : (
            <RevealGroup
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              stagger={0.05}
            >
              {paged.map((theme) => {
                const isSelected = selectedIds.has(theme.slug);
                return (
                  <RevealItem key={theme.slug} className="contents">
                    <article
                      className={cn(
                        "group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-200",
                        isSelected
                          ? "border-planetary ring-1 ring-planetary"
                          : "border-border hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          aria-label={`Select ${theme.name}`}
                          checked={isSelected}
                          onCheckedChange={(value) => toggleOne(theme.slug, value === true)}
                          className="mt-1.5"
                        />
                        <span
                          aria-hidden
                          className="size-10 shrink-0 rounded-xl ring-1 ring-galaxy/10 ring-inset"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold tracking-normal text-galaxy">
                            {theme.name}
                          </h3>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {theme.slug}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="-mr-1 -mt-1 size-8 shrink-0 text-muted-foreground"
                              aria-label={`Actions for ${theme.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(theme)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(theme)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">
                        {theme.description || "No description provided."}
                      </p>

                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="border-planetary/15 bg-sky/40 font-medium text-galaxy"
                        >
                          {libraryLabel(theme.library)}
                        </Badge>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            aria-hidden
                            className="size-3 rounded-full ring-1 ring-galaxy/10"
                            style={{ backgroundColor: theme.accent }}
                          />
                          <span className="font-mono uppercase">{theme.accent}</span>
                        </span>
                      </div>
                    </article>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}

          {!loading && total > 0 ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {start}–{end} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        </SectionCard>
      </Reveal>

      <Dialog open={bulkOpen} onOpenChange={(open) => (!open ? setBulkOpen(false) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-normal">Delete selected</DialogTitle>
            <DialogDescription>
              Delete {selectedIds.size} items? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleBulkDelete()}
              disabled={bulkBusy}
            >
              {bulkBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-normal">
              {editing ? "Edit theme" : "New theme"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the UI kit details."
                : "Add a new dashboard UI kit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="theme-name">Name</Label>
              <Input
                id="theme-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Planetary admin kit"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme-slug">Slug</Label>
              <Input
                id="theme-slug"
                value={form.slug}
                disabled={Boolean(editing)}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="auto from name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme-library">Library</Label>
              <Select
                value={form.library}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, library: value as ThemeLibrary }))
                }
              >
                <SelectTrigger id="theme-library">
                  <SelectValue placeholder="Select a library" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_LIBRARIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme-accent">Accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Accent color picker"
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  value={form.accent}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, accent: event.target.value }))
                  }
                />
                <Input
                  id="theme-accent"
                  className="font-mono"
                  value={form.accent}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, accent: event.target.value }))
                  }
                  placeholder={DEFAULT_ACCENT}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme-description">Description</Label>
              <Textarea
                id="theme-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Dense data-table kit for operational dashboards."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create theme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-normal">Delete theme</DialogTitle>
            <DialogDescription>
              This permanently removes
              {deleteTarget ? ` "${deleteTarget.name}"` : " this theme"}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
