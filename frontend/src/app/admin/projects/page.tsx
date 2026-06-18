"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { adminService, type AdminProject } from "@/lib/services/admin-service";

const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString();
}

function statusBadge(status: AdminProject["status"]) {
  if (status === "active") {
    return (
      <Badge className="border-transparent bg-success-bg text-success-foreground">active</Badge>
    );
  }
  if (status === "draft") return <Badge variant="secondary">draft</Badge>;
  return <Badge variant="outline">archived</Badge>;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [deleting, setDeleting] = useState<AdminProject | null>(null);
  const [removing, setRemoving] = useState(false);

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminService.listProjects();
      setProjects(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        project.ownerEmail.toLowerCase().includes(term),
    );
  }, [projects, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleIds = paged.map((project) => project.id);
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
        ids.map((id) => adminService.deleteProject(id)),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) toast.success(`${succeeded} deleted`);
      if (failed > 0) toast.error(`${failed} failed`);
      setBulkOpen(false);
      setSelectedIds(new Set());
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminService.deleteProject(deleting.id);
      toast.success("Project deleted");
      setDeleting(null);
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <AdminShell
      title="Projects"
      subtitle="Review projects across all accounts."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Refresh
        </Button>
      }
    >
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search name or owner email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 w-full sm:w-72"
            />
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {projects.length} projects
            </p>
          </div>

          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
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

          <div className="overflow-x-auto">
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
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No projects yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Checkbox
                          aria-label="Select row"
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={(value) => toggleOne(project.id, value === true)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{project.ownerEmail}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.domain}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(project.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {project.pagesCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {project.qualityAverage}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting(project)}
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
          </div>

          {!loading && total > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected</DialogTitle>
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
              {bulkBusy ? <Loader2 className="animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => (!open ? setDeleting(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This permanently removes {deleting?.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={removing}>
              {removing ? <Loader2 className="animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
