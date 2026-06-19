"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminService, THEME_LIBRARIES } from "@/lib/services/admin-service";
import type {
  AdminTheme,
  AdminThemeInput,
  ThemeLibrary,
} from "@/lib/services/admin-service";

const DEFAULT_ACCENT = "#334eac";
const DEFAULT_LIBRARY: ThemeLibrary = "shadcn";

export default function EditThemePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [theme, setTheme] = useState<AdminTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [library, setLibrary] = useState<ThemeLibrary>(DEFAULT_LIBRARY);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    try {
      const themes = await adminService.listThemes();
      const found = themes.find((item) => item.slug === slug) ?? null;
      if (!found) {
        setNotFound(true);
        return;
      }
      setTheme(found);
      setName(found.name);
      setAccent(found.accent);
      setLibrary(found.library);
      setDescription(found.description);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    if (!theme) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const input: AdminThemeInput = {
        name: name.trim(),
        accent,
        library,
        description: description.trim(),
      };
      await adminService.updateTheme(theme.slug, input);
      toast.success("Theme updated");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Edit theme" subtitle="Update an existing dashboard UI kit.">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <Reveal>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-2 w-fit text-muted-foreground"
          >
            <Link href="/admin/themes">
              <ArrowLeft className="size-4" />
              Back to themes
            </Link>
          </Button>
        </Reveal>

        {loading ? (
          <Reveal delay={0.05}>
            <SectionCard>
              <SectionCardHeader
                title="Loading theme"
                description="Fetching the UI kit details."
              />
              <CardContent className="grid gap-5 pt-0">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </SectionCard>
          </Reveal>
        ) : notFound ? (
          <Reveal delay={0.05}>
            <SectionCard>
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-galaxy">Theme not found</p>
                  <p className="text-sm text-muted-foreground">
                    No UI kit matches{" "}
                    <span className="font-mono text-galaxy">{slug}</span>. It may
                    have been deleted.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/admin/themes">Back to themes</Link>
                </Button>
              </div>
            </SectionCard>
          </Reveal>
        ) : (
          <>
            <Reveal delay={0.05}>
              <SectionCard>
                <SectionCardHeader
                  title="Identity"
                  description="How this UI kit is named and referenced in generated code."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-2">
                    <Label htmlFor="theme-name">Name</Label>
                    <Input
                      id="theme-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Planetary admin kit"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="theme-slug">Slug</Label>
                    <Input
                      id="theme-slug"
                      className="font-mono"
                      value={theme?.slug ?? slug}
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">
                      Slugs are permanent and cannot be changed after creation.
                    </p>
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <Reveal delay={0.1}>
              <SectionCard>
                <SectionCardHeader
                  title="Appearance"
                  description="The component library and accent color this kit targets."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-2">
                    <Label htmlFor="theme-library">Library</Label>
                    <Select
                      value={library}
                      onValueChange={(value) => setLibrary(value as ThemeLibrary)}
                    >
                      <SelectTrigger id="theme-library" className="w-full">
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
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-sky/15 p-3">
                      <span
                        aria-hidden
                        className="size-10 shrink-0 rounded-xl ring-1 ring-galaxy/10 ring-inset"
                        style={{ backgroundColor: accent }}
                      />
                      <input
                        type="color"
                        aria-label="Accent color picker"
                        className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                        value={accent}
                        onChange={(event) => setAccent(event.target.value)}
                      />
                      <Input
                        id="theme-accent"
                        className="font-mono"
                        value={accent}
                        onChange={(event) => setAccent(event.target.value)}
                        placeholder={DEFAULT_ACCENT}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="theme-description">Description</Label>
                    <Textarea
                      id="theme-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Dense data-table kit for operational dashboards."
                    />
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" asChild disabled={saving}>
                <Link href="/admin/themes">Cancel</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving changes" : "Save changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
