"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminService } from "@/lib/services/admin-service";
import type { GenerationJob } from "@/lib/api/types";

const PAGE_SIZE = 10;

function statusBadge(job: GenerationJob) {
  const badge = (() => {
    switch (job.status) {
      case "succeeded":
        return (
          <Badge className="bg-success-bg text-success-foreground">Succeeded</Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "queued":
        return <Badge variant="secondary">Queued</Badge>;
    }
  })();

  if (job.errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>{job.errorMessage}</TooltipContent>
      </Tooltip>
    );
  }
  return badge;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export default function AdminGenerationsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminService
      .listGenerationJobs()
      .then((data) => setJobs(data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminService
      .listGenerationJobs()
      .then((data) => {
        if (active) setJobs(data);
      })
      .catch(() => {
        if (active) setJobs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !q ||
        job.user.toLowerCase().includes(q) ||
        job.project.toLowerCase().includes(q);
      const matchesStatus = status === "all" || job.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [jobs, query, status]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [query, status]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleIds = paged.map((job) => job.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => adminService.retryGeneration(id)),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) toast.success(`${succeeded} retried`);
      if (failed > 0) toast.error(`${failed} failed`);
      setSelectedIds(new Set());
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleRetry = async (job: GenerationJob) => {
    try {
      await adminService.retryGeneration(job.id);
      toast.success(`Retry queued for ${job.id.slice(0, 8)}`);
      load();
    } catch {
      toast.error("Failed to retry job");
    }
  };

  return (
    <AdminShell
      title="Generation jobs"
      subtitle="Inspect queue status, retries, duration, and provider errors."
    >
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search user or project"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {filtered.length} of {jobs.length} jobs
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
              <Button
                variant="default"
                size="sm"
                onClick={() => void handleBulkRetry()}
                disabled={bulkBusy}
              >
                <RotateCcw className="size-4" />
                Retry selected
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all"
                      checked={allVisibleSelected}
                      onCheckedChange={(value) => toggleAllVisible(value === true)}
                    />
                  </TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading &&
                  paged.map((job) => {
                    const canRetry =
                      job.status === "failed" || job.status === "queued";
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Checkbox
                            aria-label="Select row"
                            checked={selectedIds.has(job.id)}
                            onCheckedChange={(value) => toggleOne(job.id, value === true)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {job.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium">{job.user}</TableCell>
                        <TableCell>{job.project}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.page}
                        </TableCell>
                        <TableCell>{statusBadge(job)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {job.retryCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {job.duration}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Row actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!canRetry}
                                onClick={() => handleRetry(job)}
                              >
                                <RotateCcw className="size-4" />
                                Retry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No jobs match the current filters.
                    </TableCell>
                  </TableRow>
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
    </AdminShell>
  );
}
