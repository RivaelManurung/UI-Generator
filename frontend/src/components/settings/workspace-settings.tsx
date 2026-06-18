"use client";

import { useState } from "react";
import { Save, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserSettings } from "@/types/settings";
import { RuleItem } from "./rule-item";

interface WorkspaceSettingsProps {
  workspace: UserSettings["workspace"];
  onSave: (payload: Partial<UserSettings["workspace"]>) => Promise<any>;
}

export function WorkspaceSettings({ workspace, onSave }: WorkspaceSettingsProps) {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [projectNaming, setProjectNaming] = useState(workspace.projectNaming);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, slug, projectNaming });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Configure naming, ownership, and studio behavior.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workspace-slug">Workspace slug</Label>
                <Input
                  id="workspace-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-naming">Default project naming</Label>
              <Select value={projectNaming} onValueChange={setProjectNaming}>
                <SelectTrigger id="project-naming">
                  <SelectValue placeholder="Select naming strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prompt-based">Prompt-based names</SelectItem>
                  <SelectItem value="timestamp">Timestamp-based names</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Generation rules</p>
              <p className="mt-1 text-xs text-muted-foreground">
                These rules are applied before the backend sends requests to the generation pipeline.
              </p>

              <div className="mt-4 grid gap-2">
                <RuleItem text="Avoid excessive gradients and generic AI-looking cards." />
                <RuleItem text="Prefer shadcn primitives and restrained hierarchy." />
                <RuleItem text="Use approved component registry before generating custom code." />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save workspace"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace members</CardTitle>
          <CardDescription>Team access for this studio.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3">
          {workspace.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {member.status}
              </Badge>
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full">
            <Plus className="h-4 w-4" />
            Invite member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
