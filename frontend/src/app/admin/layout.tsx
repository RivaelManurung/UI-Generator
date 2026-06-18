"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminThemeProvider } from "@/components/admin/admin-theme";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const status = useRequireAuth("admin");

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Verifying admin access" />
      </main>
    );
  }

  if (status === "forbidden") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin access requires a backend admin role. Your account does not have it.
          </p>
          <Button asChild className="mt-6">
            <Link href="/app">Back to app</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
