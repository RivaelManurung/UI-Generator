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
import { adminService } from "@/lib/services/admin-service";
import type { AdminTemplateInput } from "@/lib/services/admin-service";

const DOMAINS = [
  "custom",
  "hospital",
  "finance",
  "inventory",
  "education",
  "government",
  "crm",
  "pos",
  "hr",
];

const PAGE_TYPES = ["dashboard", "list", "form", "detail", "login", "analytics"];

export default function NewTemplatePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [domain, setDomain] = useState("custom");
  const [pageType, setPageType] = useState("dashboard");
  const [componentHint, setComponentHint] = useState("0");
  const [tier, setTier] = useState<"Free" | "Premium">("Free");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const input: AdminTemplateInput = {
        name: name.trim(),
        domain,
        pageType,
        componentHint: Number.isFinite(Number(componentHint)) ? Number(componentHint) : 0,
        tier,
        description: description.trim(),
      };
      if (id.trim()) {
        input.id = id.trim();
      }
      await adminService.createTemplate(input);
      toast.success("Template created");
      router.push("/admin/templates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Create template" subtitle="Add a new template to the catalog.">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="grid gap-4 py-6">
          <div className="grid gap-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hospital operations dashboard"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-id">Slug / ID</Label>
            <Input
              id="template-id"
              value={id}
              onChange={(event) => setId(event.target.value)}
              placeholder="auto from name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="template-domain">Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger id="template-domain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-page-type">Page type</Label>
              <Select value={pageType} onValueChange={setPageType}>
                <SelectTrigger id="template-page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-components">Components</Label>
              <Input
                id="template-components"
                type="number"
                min={0}
                value={componentHint}
                onChange={(event) => setComponentHint(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-tier">Tier</Label>
              <Select value={tier} onValueChange={(value) => setTier(value as "Free" | "Premium")}>
                <SelectTrigger id="template-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short summary of what this template produces."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link href="/admin/templates">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating..." : "Create template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
