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
import { themes } from "@/lib/constants/studio-themes";

const schema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
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
      defaultThemeSlug: themes[0]?.slug ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const created = await createProject({
        name: values.name,
        description: values.description ?? "",
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <Reveal>
              <SectionCard>
                <SectionCardHeader
                  title="Project details"
                  description="These defaults guide generated pages."
                />
                <CardContent className="grid gap-5 pt-0">
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
                      aria-invalid={Boolean(form.formState.errors.name)}
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
                    <Label htmlFor="defaultThemeSlug">Default theme</Label>
                    <Controller
                      control={form.control}
                      name="defaultThemeSlug"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="defaultThemeSlug"
                            className="w-full"
                            aria-invalid={Boolean(form.formState.errors.defaultThemeSlug)}
                          >
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
                      <span className="text-xs font-medium text-destructive">
                        {form.formState.errors.defaultThemeSlug.message}
                      </span>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        The UI kit generated code targets, until overridden.
                      </p>
                    )}
                  </div>
                </CardContent>
              </SectionCard>
            </Reveal>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/app/projects")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
                {submitting ? "Creating project" : "Create project"}
              </Button>
            </div>
          </div>

          <Reveal delay={0.1}>
            <SectionCard className="h-fit lg:sticky lg:top-6">
              <SectionCardHeader
                title="Project structure"
                description="Each project keeps pages, validated versions, theme defaults, and credit-safe generation history."
              />
              <CardContent className="grid gap-2.5 pt-0 text-sm">
                {structureItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-border bg-sky/15 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-planetary" />
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
    </AppShell>
  );
}

const structureItems: { label: string; hint: string }[] = [
  { label: "Project metadata", hint: "Name, description, and theme defaults." },
  { label: "Dashboard pages", hint: "Generated layouts you can refine in Studio." },
  { label: "Validated versions", hint: "Saved snapshots ready to export." },
  { label: "Theme tokens", hint: "The design system generated code targets." },
];

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
        <span className="text-xs font-medium text-destructive">{error}</span>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
