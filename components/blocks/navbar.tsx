"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavbarProps {
  brand: React.ReactNode;
  links?: Array<{ label: string; href: string }>;
  cta?: { label: string; href: string };
  sticky?: boolean;
}

export function Navbar({ brand, links = [], cta, sticky = true }: NavbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className={cn(
        "z-40 w-full border-b border-border bg-background/90 backdrop-blur",
        sticky && "sticky top-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          {brand}
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {cta && (
            <Button asChild size="sm">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </nav>
        <button
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
          {cta && (
            <Button asChild className="mt-2 w-full">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
