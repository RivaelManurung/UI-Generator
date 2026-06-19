"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { adminService, THEME_LIBRARIES } from "@/lib/services/admin-service";
import type { AdminThemeInput, ThemeLibrary } from "@/lib/services/admin-service";

const DEFAULT_ACCENT = "#334eac";
const DEFAULT_LIBRARY: ThemeLibrary = "shadcn";

export default function NewThemePage() {
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [library, setLibrary] = useState<ThemeLibrary>(DEFAULT_LIBRARY);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
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
      if (slug.trim()) {
        input.slug = slug.trim();
      }
      await adminService.createTheme(input);
      toast.success("Theme created");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Create theme" subtitle="Add a new dashboard UI kit.">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <Reveal>
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
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="auto from name"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to derive a slug from the name.
                </p>
              </div>
            </CardContent>
          </SectionCard>
        </Reveal>

        <Reveal delay={0.05}>
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
              <Plus className="size-4" />
            )}
            {saving ? "Creating theme" : "Create theme"}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
