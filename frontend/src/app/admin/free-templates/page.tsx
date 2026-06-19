"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileStack, Loader2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { freeTemplateService } from "@/lib/services/free-template-service";
import type { AdminFreeTemplate } from "@/types/free-template";

export default function AdminFreeTemplatesPage() {
  const [items, setItems] = useState<AdminFreeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Button size="sm" asChild>
          <Link href="/admin/free-templates/new">
            <Plus className="h-4 w-4" />
            Publish template
          </Link>
        </Button>
      }
    >
      <Reveal>
        <SectionCard className="overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="size-6 animate-spin text-planetary" aria-label="Loading" />
              <p className="text-sm text-muted-foreground">Loading free templates…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-sky/60 text-planetary">
                <FileStack className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">No free templates yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publish a generated page to make it available for free download.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Title
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Page type
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Downloads
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Published
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => (
                    <TableRow key={t.id} className="group hover:bg-sky/30">
                      <TableCell>
                        <div className="font-semibold text-foreground">{t.title}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">/{t.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {t.category || t.pageType}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{t.pageType}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {t.downloads}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={t.published}
                            onCheckedChange={() => togglePublished(t)}
                            aria-label={`Toggle publish for ${t.title}`}
                          />
                          {t.published ? (
                            <Badge className="border-transparent bg-success-bg text-success-foreground">
                              <span className="mr-1 size-1.5 rounded-full bg-success" aria-hidden />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Hidden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            aria-label="Open public page"
                            className="text-muted-foreground group-hover:text-planetary"
                          >
                            <a href="/templates" target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(t)}
                            aria-label={`Delete ${t.title}`}
                            className="text-muted-foreground hover:text-destructive group-hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </Reveal>
    </AdminShell>
  );
}
