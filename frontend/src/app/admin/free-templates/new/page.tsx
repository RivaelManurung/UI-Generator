"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/ui/reveal";
import { SectionCard, SectionCardHeader } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/hooks/use-projects";
import { generationService, type GeneratedPage } from "@/lib/services/generation-service";
import { freeTemplateService } from "@/lib/services/free-template-service";

const PUBLISH_NOTES: { label: string; hint: string }[] = [
  {
    label: "Project & page",
    hint: "Pick the workspace, then the generated page to snapshot. Only generated pages can be published.",
  },
  {
    label: "Title",
    hint: "Shown on the public template card. Defaults to the page name — refine it for the catalog.",
  },
  {
    label: "Category",
    hint: "Optional grouping such as dashboard or finance. Helps filter templates on the public site.",
  },
  {
    label: "Description",
    hint: "Optional one-liner summarizing what the template produces, shown beneath the title.",
  },
];

export default function NewFreeTemplatePage() {
  const router = useRouter();
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

  async function handleSubmit() {
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
      router.push("/admin/free-templates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(pageId) && title.trim().length > 0;

  return (
    <AdminShell
      title="Publish free template"
      subtitle="Snapshot a generated page and publish it as a free, downloadable template."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-6">
            <Reveal>
              <SectionCard>
                <SectionCardHeader
                  title="Source page"
                  description="Choose the project and generated page to snapshot and publish."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-2">
                    <Label htmlFor="ft-project">Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger id="ft-project" className="w-full">
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
                    <Label htmlFor="ft-page">Page</Label>
                    <Select
                      value={pageId}
                      onValueChange={setPageId}
                      disabled={pages.length === 0}
                    >
                      <SelectTrigger id="ft-page" className="w-full">
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
                </CardContent>
              </SectionCard>
            </Reveal>

            <Reveal delay={0.05}>
              <SectionCard>
                <SectionCardHeader
                  title="Catalog details"
                  description="How the template appears on the public site."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-2">
                    <Label htmlFor="ft-title">Title</Label>
                    <Input
                      id="ft-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="MasjidCare — Financial Reports"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ft-category">
                      Category{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="ft-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      placeholder="dashboard"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ft-desc">
                      Description{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="ft-desc"
                      className="min-h-24 resize-none"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Short summary shown on the card."
                    />
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" asChild disabled={submitting}>
                <Link href="/admin/free-templates">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {submitting ? "Publishing template" : "Publish template"}
              </Button>
            </div>
          </div>

          <Reveal delay={0.1}>
            <SectionCard className="h-fit lg:sticky lg:top-6">
              <SectionCardHeader
                title="Publishing fields"
                description="How each field shapes the published free template."
              />
              <CardContent className="grid gap-2.5 pt-0 text-sm">
                {PUBLISH_NOTES.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-border bg-sky/15 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-planetary" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </SectionCard>
          </Reveal>
        </div>
      </form>
    </AdminShell>
  );
}
