"use client";

import { useState } from "react";
import { Plus, KeyRound, Copy, Check, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiKey } from "@/types/api-key";
import { RuleItem } from "./rule-item";

interface ApiKeysSettingsProps {
  apiKeys: ApiKey[];
  onCreateKey: (name: string) => Promise<string>;
  onRevokeKey: (id: string) => Promise<any>;
}

export function ApiKeysSettings({ apiKeys, onCreateKey, onRevokeKey }: ApiKeysSettingsProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Key revoking confirmation dialog states
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const rawValue = await onCreateKey(newKeyName);
      setCreatedKeyValue(rawValue);
      setNewKeyName("");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!createdKeyValue) return;
    await navigator.clipboard.writeText(createdKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRevokeConfirm() {
    if (!keyToRevoke) return;
    setRevoking(true);
    try {
      await onRevokeKey(keyToRevoke.id);
      setKeyToRevoke(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Create keys for external generation API access.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} aria-label="Create new API key">
            <Plus className="h-4 w-4" />
            New key
          </Button>
        </CardHeader>

        <CardContent className="grid gap-3">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="font-semibold">Security Reminder</AlertTitle>
            <AlertDescription className="text-xs">
              For production setups, API keys must be hashed server-side using cryptographic functions (like SHA-256) and shown exactly once during creation.
            </AlertDescription>
          </Alert>

          {apiKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No API keys created yet</p>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                Create a key to call the generation API from your backend.
              </p>
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{apiKey.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {apiKey.scope}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{apiKey.prefix}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Created {apiKey.createdAt} · Last used {apiKey.lastUsed ?? apiKey.lastUsedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setKeyToRevoke(apiKey);
                    }}
                    aria-label={`Revoke API key ${apiKey.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API access</CardTitle>
          <CardDescription>Recommended security rules.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3">
          <RuleItem text="Never expose API keys in frontend code." />
          <RuleItem text="Store keys in server environment variables." />
          <RuleItem text="Rotate keys when team members leave." />
          <RuleItem text="Use separate keys for development and production." />
        </CardContent>
      </Card>

      {/* API Key Creation dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedKeyValue(null);
            setNewKeyName("");
          }
          setIsCreateOpen(open);
        }}
      >
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              {!createdKeyValue
                ? "Use a clear name so you can identify where this key is used."
                : "Your key has been created. Copy it now."}
            </DialogDescription>
          </DialogHeader>

          {!createdKeyValue ? (
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create key"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="grid gap-4">
              <Alert className="bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="font-semibold">Copy your API key</AlertTitle>
                <AlertDescription className="text-xs">
                  For security, this key is hashed server-side and will only be displayed once. Copy it now and store it safely.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Input readOnly value={createdKeyValue} className="font-mono text-sm" />
                <Button size="icon" onClick={handleCopy} aria-label="Copy key to clipboard">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" className="w-full" onClick={() => setIsCreateOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* API Key Revocation confirmation dialog */}
      <Dialog open={keyToRevoke !== null} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the key <strong>{keyToRevoke?.name}</strong>? This action is permanent and will break any clients using this token.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setKeyToRevoke(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleRevokeConfirm} disabled={revoking}>
              {revoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
