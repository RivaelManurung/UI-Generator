"use client";

import { Loader2 } from "lucide-react";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { GenerationProvider } from "@/components/app/generation-provider";
import { GenerationIndicator } from "@/components/app/generation-indicator";

export default function UserAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const status = useRequireAuth();

  if (status !== "authorized") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading workspace" />
      </main>
    );
  }

  // Toasts render via the single global <Toaster> mounted in components/providers.tsx.
  // GenerationProvider + GenerationIndicator persist across /app route changes
  // because the app-router keeps this layout mounted while navigating.
  return (
    <GenerationProvider>
      {children}
      <GenerationIndicator />
    </GenerationProvider>
  );
}
