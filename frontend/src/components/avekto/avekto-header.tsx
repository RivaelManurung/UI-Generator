"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Product", hasMenu: true },
  { label: "Solutions", hasMenu: true },
  { label: "Resources", hasMenu: true },
  { label: "Pricing", hasMenu: false },
  { label: "Contact", hasMenu: false },
] as const;

export function AvektoHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-landing-border bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="#" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-planetary text-white">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold tracking-normal text-galaxy">Avekto</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <button
              key={item.label}
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-[13px] font-medium text-landing-text-soft transition hover:text-galaxy"
            >
              {item.label}
              {item.hasMenu ? (
                <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-[13px] font-medium text-landing-text-soft transition hover:text-galaxy"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-md bg-planetary px-4 text-[13px] font-semibold text-white shadow-brand-sm transition hover:brightness-95"
          >
            Sign up
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid size-9 place-items-center rounded-md border border-landing-border text-galaxy md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-landing-border bg-white md:hidden",
          open ? "max-h-96" : "max-h-0 border-t-0",
        )}
      >
        <nav className="grid gap-1 px-4 py-3">
          {nav.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium text-landing-text-soft hover:bg-meteor/60 hover:text-galaxy"
            >
              {item.label}
              {item.hasMenu ? <ChevronDown className="size-4 opacity-60" /> : null}
            </button>
          ))}
          <div className="mt-2 grid gap-2 border-t border-landing-border pt-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-2.5 text-sm font-semibold text-galaxy hover:bg-meteor/60"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-planetary px-4 text-sm font-semibold text-white"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
