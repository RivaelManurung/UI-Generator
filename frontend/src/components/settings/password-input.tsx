"use client";

import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  id: string;
  placeholder: string;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  name?: string;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  placeholder,
  visible,
  onVisibleChange,
  name,
  autoComplete,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="pr-10"
        autoComplete={autoComplete}
      />

      <button
        type="button"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => onVisibleChange(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
