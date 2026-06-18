"use client";

import { useState } from "react";
import { Wrench, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RefineSectionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: string[];
  creditsBalance: number;
  onRefine: (sectionName: string, instruction: string) => Promise<any>;
}

export function RefineSectionPanel({
  open,
  onOpenChange,
  sections,
  creditsBalance,
  onRefine,
}: RefineSectionPanelProps) {
  const [selectedSection, setSelectedSection] = useState("");
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const cost = 1;

  async function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSection || !instruction.trim()) return;
    setRefining(true);
    try {
      await onRefine(selectedSection, instruction);
      setInstruction("");
      setSelectedSection("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRefining(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Refine Layout Section</SheetTitle>
          <SheetDescription className="text-xs">
            Modify details in a specific panel without regenerating the entire page.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleRefineSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="refine-section-select">Select Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger id="refine-section-select" aria-label="Select a page section to refine" className="text-xs">
                <SelectValue placeholder="Choose a page section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section} value={section} className="text-xs capitalize">
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="refine-instruction">Refinement Instruction</Label>
            <Textarea
              id="refine-instruction"
              placeholder="e.g. Change table columns, use dynamic status colors, add filter presets..."
              className="min-h-[100px] text-xs resize-none rounded-xl"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              required
            />
          </div>

          <Alert className="bg-muted/40 border-border">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-semibold text-xs">Cost confirmation</AlertTitle>
            <AlertDescription className="text-[10px] leading-4 font-medium text-muted-foreground mt-0.5">
              Refinement costs <strong>{cost} credit</strong>. Your wallet has <strong>{creditsBalance} credits</strong>. This will compile a new layout version.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            className="w-full text-xs font-bold mt-2"
            disabled={!selectedSection || !instruction.trim() || creditsBalance < cost || refining}
          >
            {refining ? "Refining Section..." : `Apply Refinement (${cost} Credit)`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
