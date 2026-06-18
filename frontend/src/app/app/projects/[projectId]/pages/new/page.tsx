"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

export default function CreatePageRedirect() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? "";

  useEffect(() => {
    router.replace(projectId ? `/app/studio/${projectId}` : "/app/studio/demo");
  }, [router, projectId]);

  return (
    <AppShell title="Studio" subtitle="Page generation happens in Studio.">
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Opening Studio…</p>
      </div>
    </AppShell>
  );
}
