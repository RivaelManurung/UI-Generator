"use client";

import { useState } from "react";
import { Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserSettings } from "@/types/settings";
import { StatusRow } from "./status-row";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";

interface ProfileSettingsProps {
  profile: UserSettings["profile"];
  workspaceName: string;
  onSave: (payload: Partial<UserSettings["profile"]>) => Promise<any>;
}

export function ProfileSettings({ profile, workspaceName, onSave }: ProfileSettingsProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, email, bio });
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
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage account identity used across your studio workspace.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
              <Avatar className="h-14 w-14">
                <AvatarFallback>
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>

              <Button type="button" variant="outline" size="sm">
                Change avatar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                className="min-h-24 resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account status</CardTitle>
          <CardDescription>Your current workspace identity.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3">
          <StatusRow label="Plan" value="Pro" />
          <StatusRow label="Workspace" value={workspaceName} />
          <StatusRow label="Email status" value="Verified" />
          <StatusRow label="Member since" value="Jun 2026" />

          <Separator />

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Production workspace</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your account can generate, preview, and export projects.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
