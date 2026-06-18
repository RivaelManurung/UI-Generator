"use client";

import { useState } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

interface DangerZoneProps {
  onDeleteWorkspace: () => Promise<any>;
}

export function DangerZone({ onDeleteWorkspace }: DangerZoneProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await onDeleteWorkspace();
      alert("Workspace data cleared (mocked).");
      setIsConfirmOpen(false);
      setConfirmText("");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Destructive workspace actions. Use carefully.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Delete workspace data</p>
            <p className="text-xs text-muted-foreground mt-1 leading-5 font-medium">
              This removes projects, generated files, previews, and API keys from this workspace.
            </p>
          </div>

          <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} className="shrink-0">
            <Trash2 className="h-4 w-4" />
            Delete workspace
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmText("");
          setIsConfirmOpen(open);
        }}
      >
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Delete Workspace
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              This action is irreversible. All generated projects and API credentials will be permanently erased. Type <strong>DELETE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Label htmlFor="delete-confirm" className="sr-only">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
              autoFocus
            />
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
            >
              {deleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
