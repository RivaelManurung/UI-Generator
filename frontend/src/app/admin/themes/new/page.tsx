"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Card className="mx-auto max-w-xl">
        <CardContent className="grid gap-4 py-6">
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
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="auto from name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-library">Library</Label>
            <Select
              value={library}
              onValueChange={(value) => setLibrary(value as ThemeLibrary)}
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link href="/admin/themes">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating..." : "Create theme"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
