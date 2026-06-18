import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The workspace page you requested does not exist.
        </p>
        <Button asChild className="mt-6">
          <Link href="/app">Back to app</Link>
        </Button>
      </div>
    </main>
  );
}
