"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
      <Card>
        <CardContent className="p-0">
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-2">
              <span className="text-sm font-medium tabular-nums">
                {selectedIds.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <Button variant="destructive" size="sm" onClick={() => setBulkOpen(true)}>
                Delete selected
              </Button>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    onCheckedChange={(value) => toggleAllVisible(value === true)}
                  />
                </TableHead>
                <TableHead>Kit</TableHead>
                <TableHead>Library</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : themes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    No themes yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((theme) => (
                  <TableRow key={theme.slug}>
                    <TableCell>
                      <Checkbox
                        aria-label="Select row"
                        checked={selectedIds.has(theme.slug)}
                        onCheckedChange={(value) => toggleOne(theme.slug, value === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="size-5 shrink-0 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <span className="font-semibold tracking-normal">{theme.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{libraryLabel(theme.library)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {theme.slug}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {theme.description}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Theme actions">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && total > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
        </CardContent>
      </Card>

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
