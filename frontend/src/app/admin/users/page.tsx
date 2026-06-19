"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { SectionCard } from "@/components/ui/section-card";
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
import { toast } from "sonner";

import { adminService } from "@/lib/services/admin-service";
import type { AdminUser } from "@/lib/api/types";

type Role = "user" | "admin";
type Status = "active" | "review" | "suspended";

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString();
}

function roleBadge(role: AdminUser["role"]) {
  if (role === "user") {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
        user
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-planetary/20 bg-sky/60 text-planetary capitalize"
    >
      <ShieldCheck className="h-3 w-3" />
      {role}
    </Badge>
  );
}

function statusBadge(status: Status) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-success-border bg-success-bg text-success-foreground">
        active
      </Badge>
    );
  }
  if (status === "review") {
    return (
      <Badge variant="outline" className="border-warning-border bg-warning-bg text-warning-foreground">
        review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
      suspended
    </Badge>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<Role>("user");
  const [editStatus, setEditStatus] = useState<Status>("active");
  const [editCredits, setEditCredits] = useState("0");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminService.listUsers();
      setUsers(data);
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
    return users.filter((user) => {
      const matchesTerm =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesTerm && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const summary = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc.total += 1;
        if (user.role === "admin" || user.role === "owner") acc.admins += 1;
        if (user.status === "active") acc.active += 1;
        if (user.status === "suspended") acc.suspended += 1;
        return acc;
      },
      { total: 0, admins: 0, active: 0, suspended: 0 },
    );
  }, [users]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleIds = paged.map((user) => user.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        visibleIds.forEach((id) => next.add(id));
      } else {
        visibleIds.forEach((id) => next.delete(id));
      }
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
        ids.map((id) => adminService.deleteUser(id)),
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

  function openEdit(user: AdminUser) {
    setEditing(user);
    setEditRole(user.role === "admin" ? "admin" : "user");
    setEditStatus(user.status);
    setEditCredits(String(user.credits));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await adminService.updateUser(editing.id, {
        role: editRole,
        status: editStatus,
        credits: Number(editCredits) || 0,
      });
      toast.success("User updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminService.deleteUser(deleting.id);
      toast.success("User deleted");
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
      title="Users"
      subtitle="Manage accounts, roles, and credits."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      }
    >
      <RevealGroup
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        stagger={0.05}
      >
        {[
          { label: "Total accounts", value: summary.total, icon: Users },
          { label: "Active", value: summary.active, icon: UsersRound },
          { label: "Admins", value: summary.admins, icon: ShieldCheck },
          { label: "Suspended", value: summary.suspended, icon: UserCog },
        ].map((kpi) => (
          <RevealItem key={kpi.label}>
            <SectionCard className="group h-full transition hover:-translate-y-0.5 hover:border-planetary/30 hover:shadow-brand-sm">
              <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-normal text-galaxy">
                    {loading ? "—" : kpi.value}
                  </p>
                </div>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky/60 text-planetary transition group-hover:bg-planetary group-hover:text-white"
                  aria-hidden="true"
                >
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
            </SectionCard>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-6">
      <SectionCard>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Search name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 w-full pl-8"
                  aria-label="Search users by name or email"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as "all" | Role)}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | Status)}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              {users.length} accounts
            </p>
          </div>

          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-planetary/20 bg-sky/40 px-3 py-2">
              <span className="text-sm font-semibold tabular-nums text-galaxy">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
              <Separator orientation="vertical" className="h-5 bg-planetary/20" />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border">
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead>Joined</TableHead>
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
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="py-14">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <span
                          className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-sky/60 text-planetary"
                          aria-hidden="true"
                        >
                          <Users className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-medium text-foreground">No users found</p>
                        <p className="text-sm text-muted-foreground">
                          {users.length === 0
                            ? "Accounts will appear here once people sign up."
                            : "Try adjusting your search or filters."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((user) => (
                    <TableRow key={user.id} className="group transition-colors hover:bg-sky/30">
                      <TableCell>
                        <Checkbox
                          aria-label="Select row"
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={(value) => toggleOne(user.id, value === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="bg-sky/60 text-xs font-semibold text-planetary transition-colors group-hover:bg-planetary group-hover:text-white">
                              {initials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      <TableCell>{statusBadge(user.status)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums tracking-normal text-galaxy">
                        {user.credits}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{user.projects}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.pagesGenerated}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(user.joinedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${user.name}`}
                              className="text-muted-foreground transition-colors group-hover:text-planetary"
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEdit(user)}>
                              <UserCog className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting(user)}
                            >
                              <Trash2 className="h-4 w-4" />
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
              <p className="text-xs text-muted-foreground tabular-nums">
                Showing {start}–{end} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="px-1 text-xs font-medium text-muted-foreground tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </SectionCard>
      </Reveal>

      <Dialog open={bulkOpen} onOpenChange={(open) => (!open ? setBulkOpen(false) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-normal">Delete selected accounts</DialogTitle>
            <DialogDescription>
              Permanently delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "account" : "accounts"}? This cannot be undone.
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
              {bulkBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => (!open ? setEditing(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-normal">Edit user</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-status">Status</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as Status)}>
                <SelectTrigger id="user-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-credits">Credits</Label>
              <Input
                id="user-credits"
                type="number"
                value={editCredits}
                onChange={(event) => setEditCredits(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => (!open ? setDeleting(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-normal">Delete user</DialogTitle>
            <DialogDescription>
              This permanently removes {deleting?.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={removing}>
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
