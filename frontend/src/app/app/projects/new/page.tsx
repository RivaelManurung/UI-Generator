"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/hooks/use-projects";
import { themes } from "@/lib/constants/studio-themes";

const domains = [
  "custom",
  "hospital",
  "finance",
  "inventory",
  "education",
  "government",
  "crm",
  "pos",
  "hr",
] as const;

const schema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  domain: z.string().min(1, "Select a domain"),
  defaultThemeSlug: z.string().min(1, "Select a default theme"),
});

type FormValues = z.infer<typeof schema>;

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject } = useProjects();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      domain: "custom",
      defaultThemeSlug: themes[0]?.slug ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const created = await createProject({
        name: values.name,
        description: values.description ?? "",
        domain: values.domain,
        status: "draft",
        defaultThemeSlug: values.defaultThemeSlug,
      });
      toast.success("Project created");
      router.push(created?.id ? `/app/studio/${created.id}` : "/app/studio/demo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="New project"
      subtitle="Create a project container for dashboard pages, themes, and versions."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="tracking-normal">Project details</CardTitle>
            <CardDescription>These defaults guide generated pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
              <Field
                id="name"
                label="Project name"
                hint="Shown across your workspace and studio."
                error={form.formState.errors.name?.message}
              >
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Hospital Ops Dashboard"
                />
              </Field>

              <Field
                id="description"
                label="Description"
                hint="A short summary of what this project covers."
                error={form.formState.errors.description?.message}
              >
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Operational dashboard for appointments and departments."
                />
              </Field>

              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Controller
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="domain" className="w-full">
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain} value={domain} className="capitalize">
                            {domain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.domain ? (
                  <span className="text-xs text-rose-600">
                    {form.formState.errors.domain.message}
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sets the schema preset for generated pages.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultThemeSlug">Default theme</Label>
                <Controller
                  control={form.control}
                  name="defaultThemeSlug"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="defaultThemeSlug" className="w-full">
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme.slug} value={theme.slug}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.defaultThemeSlug ? (
                  <span className="text-xs text-rose-600">
                    {form.formState.errors.defaultThemeSlug.message}
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The UI kit generated code targets, until overridden.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderPlus className="h-4 w-4" />
                  )}
                  Create project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="tracking-normal">Project structure</CardTitle>
            <CardDescription>
              Each project keeps pages, validated versions, theme defaults, and credit-safe
              generation history.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 text-sm">
            {["Project metadata", "Dashboard pages", "Validated versions", "Theme tokens"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 rounded-lg border bg-muted/30 p-3 font-medium text-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
