"use client";

import { useParams } from "next/navigation";

import StudioShell from "./studio-shell";

export default function StudioPage() {
  const params = useParams();
  const raw = params?.pageId;
  const routeProjectId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return <StudioShell routeProjectId={routeProjectId} />;
}
