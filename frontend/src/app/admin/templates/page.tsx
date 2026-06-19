"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, LayoutTemplate, Loader2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Reveal } from "@/components/ui/reveal";
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
import { adminService } from "@/lib/services/admin-service";
import type { AdminTemplate, AdminTemplateInput } from "@/lib/services/admin-service";

const DOMAINS = [
  "custom",
  "hospital",
  "finance",
  "inventory",
  "education",
  "government",
  "crm",
  "pos",
  "hr",
];

const PAGE_TYPES = ["dashboard", "list", "form", "detail", "login", "analytics"];

const PAGE_SIZE = 10;

type FormState = {
  id: string;
  name: string;
  domain: string;
  pageType: string;
  componentHint: string;
  tier: "Free" | "Premium";
  description: string;
};

function emptyForm(): FormState {
  return {
    id: "",
    name: "",
    domain: "custom",
    pageType: "dashboard",
    componentHint: "0",
    tier: "Free",
    description: "",
  };
}

function toInput(form: FormState, includeId: boolean): AdminTemplateInput {
  const input: AdminTemplateInput = {
    name: form.name.trim(),
    domain: form.domain,
    pageType: form.pageType,
    componentHint: Number.isFinite(Number(form.componentHint))
      ? Number(form.componentHint)
      : 0,
    tier: form.tier,
    description: form.description.trim(),
  };
  if (includeId && form.id.trim()) {
    input.id = form.id.trim();
  }
  return input;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.listTemplates();
      setTemplates(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = templates;
  const total = filtered.length;
  const premiumCount = useMemo(
    () => templates.filter((template) => template.tier === "Premium").length,
    [templates],
  );
  const freeCount = total - premiumCount;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleIds = paged.map((template) => template.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => adminService.deleteTemplate(id)),
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

  function openEdit(template: AdminTemplate) {
    setEditing(template);
    setForm({
      id: template.id,
      name: template.name,
      domain: template.domain,
      pageType: template.pageType,
      componentHint: String(template.componentHint),
      tier: template.tier,
      description: template.description,
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
        await adminService.updateTemplate(editing.id, toInput(form, false));
        toast.success("Template updated");
      } else {
        await adminService.createTemplate(toInput(form, true));
        toast.success("Template created");
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
      await adminService.deleteTemplate(deleteTarget.id);
      toast.success("Template deleted");
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
      title="Templates"
      subtitle="Manage the template catalog used to seed new projects."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          New template
        </Button>
      }
    >
      <div className="space-y-6">
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={LayoutTemplate}
            label="Total templates"
            value={total}
            hint="In the catalog"
          />
          <SummaryCard
            icon={Crown}
            label="Premium"
            value={premiumCount}
            hint="Paid-tier templates"
          />
          <SummaryCard
            icon={Sparkles}
            label="Free"
            value={freeCount}
            hint="Open to every workspace"
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
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
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    onCheckedChange={(value) => toggleAllVisible(value === true)}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Page type</TableHead>
                <TableHead className="text-right">Components</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/60 text-planetary">
                        <LayoutTemplate className="size-6" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold tracking-normal text-foreground">
                          No templates yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Create your first template to seed new projects.
                        </p>
                      </div>
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="size-4" />
                        New template
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((template) => (
                  <TableRow key={template.id} className="group hover:bg-sky/30">
                    <TableCell>
                      <Checkbox
                        aria-label="Select row"
                        checked={selectedIds.has(template.id)}
                        onCheckedChange={(value) => toggleOne(template.id, value === true)}
                      />
                    </TableCell>
                    <TableCell className="font-semibold tracking-normal">
                      <span className="transition-colors group-hover:text-planetary">
                        {template.name}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {template.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-muted/50 capitalize text-foreground"
                      >
                        {template.domain}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {template.pageType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {template.componentHint}
                    </TableCell>
                    <TableCell>
                      {template.tier === "Premium" ? (
                        <Badge className="gap-1 bg-warning-bg text-warning-foreground">
                          <Crown className="size-3" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="bg-success-bg text-success-foreground">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Template actions"
                            className="group-hover:text-planetary"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(template)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(template)}
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
      </Reveal>
      </div>

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
              {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {bulkBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-normal">
              {editing ? "Edit template" : "New template"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the template metadata."
                : "Add a new template to the catalog."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Hospital operations dashboard"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-id">Slug / ID</Label>
              <Input
                id="template-id"
                value={form.id}
                disabled={Boolean(editing)}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="auto from name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="template-domain">Domain</Label>
                <Select
                  value={form.domain}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, domain: value }))}
                >
                  <SelectTrigger id="template-domain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-page-type">Page type</Label>
                <Select
                  value={form.pageType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, pageType: value }))}
                >
                  <SelectTrigger id="template-page-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map((pageType) => (
                      <SelectItem key={pageType} value={pageType}>
                        {pageType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-components">Components</Label>
                <Input
                  id="template-components"
                  type="number"
                  min={0}
                  value={form.componentHint}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, componentHint: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-tier">Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, tier: value as "Free" | "Premium" }))
                  }
                >
                  <SelectTrigger id="template-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free">Free</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Short summary of what this template produces."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Saving..." : editing ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-normal">Delete template</DialogTitle>
            <DialogDescription>
              This permanently removes
              {deleteTarget ? ` "${deleteTarget.name}"` : " this template"}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof LayoutTemplate;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="group transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
      <CardContent className="flex items-start gap-3.5 pt-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky/60 text-planetary transition-colors group-hover:bg-planetary group-hover:text-white">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-normal text-galaxy">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
