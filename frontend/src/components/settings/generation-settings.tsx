"use client";

import { useMemo, useState } from "react";
import { Save, RotateCcw, Monitor, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleRow } from "./toggle-row";
import { UserSettings } from "@/types/settings";
import { themeOptions } from "@/lib/constants/theme-options";
import { deviceOptions } from "@/lib/constants/device-options";

interface GenerationSettingsProps {
  preferences: UserSettings["generationPreferences"];
  onSave: (payload: Partial<UserSettings["generationPreferences"]>) => Promise<any>;
}

export function GenerationSettings({ preferences, onSave }: GenerationSettingsProps) {
  const [defaultTheme, setDefaultTheme] = useState(preferences.defaultTheme);
  const [defaultDevice, setDefaultDevice] = useState(preferences.defaultDevice);
  const [promptBoosting, setPromptBoosting] = useState(preferences.promptBoosting);
  const [autoSave, setAutoSave] = useState(preferences.autoSave);
  const [safeMode, setSafeMode] = useState(preferences.safeMode);
  const [previewGuides, setPreviewGuides] = useState(preferences.previewGuides);
  const [compactMode, setCompactMode] = useState(preferences.compactMode);
  const [saving, setSaving] = useState(false);

  const selectedTheme = useMemo(
    () => themeOptions.find((t) => t.value === defaultTheme) ?? themeOptions[0],
    [defaultTheme]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        defaultTheme,
        defaultDevice,
        promptBoosting,
        autoSave,
        safeMode,
        previewGuides,
        compactMode,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Generation defaults</CardTitle>
          <CardDescription>
            Control how new projects are generated before credits are used.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="default-theme">Default theme</Label>
              <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                <SelectTrigger id="default-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label} · {theme.cost} credit{theme.cost > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default-device">Default preview device</Label>
              <Select value={defaultDevice} onValueChange={setDefaultDevice}>
                <SelectTrigger id="default-device">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {deviceOptions.map((device) => (
                    <SelectItem key={device.value} value={device.value}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            <ToggleRow
              title="Prompt boosting"
              description="Improve vague prompts before generation to reduce low-quality output."
              checked={promptBoosting}
              onCheckedChange={setPromptBoosting}
              icon={RotateCcw}
            />

            <ToggleRow
              title="Auto-save progress"
              description="Persist generation checkpoints every few seconds."
              checked={autoSave}
              onCheckedChange={setAutoSave}
              icon={Save}
            />

            <ToggleRow
              title="Safe component mode"
              description="Restrict output to approved shadcn-compatible component patterns."
              checked={safeMode}
              onCheckedChange={setSafeMode}
              icon={ShieldCheck}
            />

            <ToggleRow
              title="Preview guides"
              description="Show responsive preview helpers while inspecting generated pages."
              checked={previewGuides}
              onCheckedChange={setPreviewGuides}
              icon={Eye}
            />

            <ToggleRow
              title="Compact studio layout"
              description="Reduce panel spacing for smaller laptop screens."
              checked={compactMode}
              onCheckedChange={setCompactMode}
              icon={Monitor}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save generation settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme preview</CardTitle>
          <CardDescription>Default visual direction for new generations.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedTheme.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTheme.cost} credit{selectedTheme.cost > 1 ? "s" : ""} per generation
                  </p>
                </div>
                <Badge variant="secondary">Default</Badge>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="h-2 rounded-full bg-primary/80" />
                <div className="h-2 w-4/5 rounded-full bg-muted-foreground/20" />
                <div className="h-2 w-2/3 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-16 rounded-lg border border-border bg-background" />
                <div className="h-16 rounded-lg border border-border bg-background" />
                <div className="h-16 rounded-lg border border-border bg-background" />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{selectedTheme.description}</p>

          <Button type="button" variant="outline" onClick={() => setDefaultTheme("jakarta-lite")}>
            <RotateCcw className="h-4 w-4" />
            Reset to recommended
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
