"use client";

import { useState } from "react";
import { Wrench, Info } from "lucide-react";
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
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-planetary/15 bg-sky/40 text-planetary">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-galaxy">
                Refine Layout Section
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs leading-5">
                Modify details in a specific panel without regenerating the
                entire page.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleRefineSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="refine-section-select" className="text-xs font-medium text-galaxy">
              Select Section
            </Label>
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
            <Label htmlFor="refine-instruction" className="text-xs font-medium text-galaxy">
              Refinement Instruction
            </Label>
            <Textarea
              id="refine-instruction"
              placeholder="e.g. Change table columns, use dynamic status colors, add filter presets..."
              className="min-h-[100px] text-xs resize-none rounded-xl"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              required
            />
          </div>

          <Alert className="border-planetary/20 bg-sky/25 text-galaxy">
            <Info className="h-4 w-4 text-planetary" />
            <AlertTitle className="text-xs font-semibold text-galaxy">Cost confirmation</AlertTitle>
            <AlertDescription className="mt-0.5 text-[11px] font-medium leading-4 text-muted-foreground">
              Refinement costs <strong className="text-foreground">{cost} credit</strong>. Your wallet has <strong className="text-foreground">{creditsBalance} credits</strong>. This will compile a new layout version.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            className="mt-2 w-full text-xs font-bold"
            disabled={!selectedSection || !instruction.trim() || creditsBalance < cost || refining}
          >
            {refining ? "Refining Section..." : `Apply Refinement (${cost} Credit)`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
