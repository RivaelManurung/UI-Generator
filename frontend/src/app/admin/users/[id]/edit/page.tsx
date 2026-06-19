"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw, Save } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/lib/services/admin-service";
import type { AdminUserOverview } from "@/lib/services/admin-service";

type Role = "user" | "admin";
type Status = "active" | "review" | "suspended";

const STATUS_NOTES: { label: string; hint: string }[] = [
  { label: "Active", hint: "Full access to studio, generation, and billing." },
  { label: "Review", hint: "Flagged for manual review; access is unchanged." },
  { label: "Suspended", hint: "Blocks generation and billing actions for this account." },
];

function normalizeRole(role: string): Role {
  return role === "admin" || role === "owner" ? "admin" : "user";
}

function normalizeStatus(status: string): Status {
  if (status === "active" || status === "review" || status === "suspended") {
    return status;
  }
  return "active";
}

export default function AdminUserEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [overview, setOverview] = useState<AdminUserOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<Role>("user");
  const [status, setStatus] = useState<Status>("active");
  const [credits, setCredits] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getUserOverview(id);
      setOverview(data);
      setRole(normalizeRole(data.role));
      setStatus(normalizeStatus(data.status));
      setCredits(String(data.walletBalance));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    try {
      await adminService.updateUser(id, {
        role,
        status,
        credits: Number(credits) || 0,
      });
      toast.success("User updated");
      router.push(`/admin/users/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Edit user"
      subtitle={overview?.email ?? "Update role, status, and credits."}
    >
      <div className="mb-5">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href={`/admin/users/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to user
          </Link>
        </Button>
      </div>

      {error ? (
        <SectionCard className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Couldn’t load this user</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </SectionCard>
      ) : loading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Reveal>
              <SectionCard>
                <SectionCardHeader
                  title="Account access"
                  description="Role and account status for this user."
                />
                <CardContent className="grid gap-5 pt-0">
                  <div className="grid gap-2">
                    <Label htmlFor="user-role">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                      <SelectTrigger id="user-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="user-status">Status</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                      <SelectTrigger id="user-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="user-credits">Credits</Label>
                    <Input
                      id="user-credits"
                      type="number"
                      min={0}
                      value={credits}
                      onChange={(event) => setCredits(event.target.value)}
                      className="tabular-nums"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sets the wallet balance to this exact value.
                    </p>
                  </div>
                </CardContent>
              </SectionCard>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" asChild disabled={saving}>
                  <Link href={`/admin/users/${id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saving ? "Saving changes" : "Save changes"}
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <SectionCard className="h-fit lg:sticky lg:top-6">
                <SectionCardHeader
                  title="Status reference"
                  description="What each account status means."
                />
                <CardContent className="grid gap-2.5 pt-0 text-sm">
                  {STATUS_NOTES.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-sky/15 p-3"
                    >
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                  ))}
                </CardContent>
              </SectionCard>
            </Reveal>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
