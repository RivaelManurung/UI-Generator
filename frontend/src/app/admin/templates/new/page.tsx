"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
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
import { adminService } from "@/lib/services/admin-service";
import type { AdminTemplateInput } from "@/lib/services/admin-service";

const CATALOG_NOTES: { label: string; hint: string }[] = [
  { label: "Slug / ID", hint: "Stable key used to seed projects. Leave blank to auto-derive from the name." },
  { label: "Domain & page type", hint: "Drives the schema preset and sample layout generated from this template." },
  { label: "Tier", hint: "Free templates are open to every workspace; Premium is paid-tier only." },
  { label: "Components", hint: "Approximate component count surfaced in the catalog listing." },
];

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
                  title="Template identity"
                  description="Name and slug used across the catalog and generated projects."
                />
                <CardContent className="grid gap-5 pt-0">
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
                    <p className="text-xs text-muted-foreground">
                      Leave blank to derive the slug automatically from the name.
                    </p>
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <Reveal delay={0.05}>
              <SectionCard>
                <SectionCardHeader
                  title="Catalog metadata"
                  description="Classification that drives the schema preset and listing."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="template-domain">Domain</Label>
                      <Select value={domain} onValueChange={setDomain}>
                        <SelectTrigger id="template-domain" className="w-full capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOMAINS.map((value) => (
                            <SelectItem key={value} value={value} className="capitalize">
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-page-type">Page type</Label>
                      <Select value={pageType} onValueChange={setPageType}>
                        <SelectTrigger id="template-page-type" className="w-full capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_TYPES.map((value) => (
                            <SelectItem key={value} value={value} className="capitalize">
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
                        className="tabular-nums"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-tier">Tier</Label>
                      <Select
                        value={tier}
                        onValueChange={(value) => setTier(value as "Free" | "Premium")}
                      >
                        <SelectTrigger id="template-tier" className="w-full">
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
                </CardContent>
              </SectionCard>
            </Reveal>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" asChild disabled={saving}>
                <Link href="/admin/templates">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {saving ? "Creating template" : "Create template"}
              </Button>
            </div>
          </div>

          <Reveal delay={0.1}>
            <SectionCard className="h-fit lg:sticky lg:top-6">
              <SectionCardHeader
                title="Catalog fields"
                description="How each field shapes the template once it is published."
              />
              <CardContent className="grid gap-2.5 pt-0 text-sm">
                {CATALOG_NOTES.map((item) => (
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
