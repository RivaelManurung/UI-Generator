"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import StudioShell from "./studio-shell";

export default function StudioPage() {
  const params = useParams();
  const raw = params?.pageId;
  const routeProjectId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  // StudioShell reads useSearchParams (template handoff), which App Router requires
  // to sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <StudioShell routeProjectId={routeProjectId} />
    </Suspense>
  );
}
