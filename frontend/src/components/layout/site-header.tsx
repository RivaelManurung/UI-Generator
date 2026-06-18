"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#generator", label: "Generator" },
  { href: "/#projects", label: "Projects" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="landing-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="landing-brand-mark grid size-9 place-items-center rounded-2xl text-sm font-semibold">
            D
          </span>
          <span className="leading-none">
            <span className="block text-sm font-semibold tracking-normal">DashboardCraft</span>
            <span className="landing-text-muted mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em]">
              Project UI Generator
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="landing-text-soft transition hover:text-galaxy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="landing-text-soft hidden rounded-full px-4 py-2 text-sm font-semibold transition hover:text-galaxy sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/app/studio/demo"
            prefetch={false}
            className="landing-primary-button hidden h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5 sm:inline-flex"
          >
            Generate project
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-landing-border bg-white/70 md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Link href="/" className="flex items-center gap-3">
                    <span className="landing-brand-mark grid size-9 place-items-center rounded-2xl text-sm font-semibold">
                      D
                    </span>
                    <span>DashboardCraft</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="grid gap-1 px-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 p-4">
                <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
                  Login
                </Link>
                <Link href="/app/studio/demo" className={cn(buttonVariants())}>
                  Generate project
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
