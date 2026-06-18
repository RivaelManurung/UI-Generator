import { Check } from "lucide-react";

interface RuleItemProps {
  text: string;
}

export function RuleItem({ text }: RuleItemProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
      <span>{text}</span>
    </div>
  );
}
