"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Blocks, CheckCircle2, Crown } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTemplates, type Template } from "@/hooks/use-templates";

export default function AppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTemplates()
      .then((data) => {
        if (active) setTemplates(data);
      })
      .catch(() => {
        if (active) setTemplates([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Templates" subtitle="Starter dashboards you can generate from.">
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No templates available</p>
          <p className="text-sm text-muted-foreground">
            Starter templates will appear here once they are published.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const isPremium = template.tier === "Premium";

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
            {template.domain}
          </Badge>
          {isPremium ? (
            <Badge className="bg-primary text-primary-foreground">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          ) : (
            <Badge variant="outline">
              <CheckCircle2 className="h-3 w-3" />
              Free
            </Badge>
          )}
        </div>
        <CardTitle className="mt-2 tracking-normal">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Blocks className="h-3.5 w-3.5" />
            <span className="tabular-nums">{template.componentHint}</span> components
          </span>
          <span className="capitalize">{template.pageType}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/app/studio/demo">Use template</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
