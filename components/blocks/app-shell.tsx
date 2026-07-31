"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  brand: React.ReactNode;
  nav: Array<{ label: string; href: string; icon?: React.ReactNode }>;
  /** Right side of the top bar: user menu, actions, search… */
  topbar?: React.ReactNode;
  footerNote?: string;
  children: React.ReactNode;
}

/** Sidebar + topbar chrome for dashboards, CRMs, portals and internal tools.
 *  Pages render inside; the active nav item highlights from the pathname. */
export function AppShell({ brand, nav, topbar, footerNote, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 items-center border-b border-border px-5 font-display text-base font-semibold">
          {brand}
        </div>
        {navList}
        {footerNote && (
          <p className="border-t border-border p-4 text-xs text-muted-foreground">{footerNote}</p>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <button className="md:hidden" aria-label="Toggle navigation" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-display font-semibold md:hidden">{brand}</span>
          <div className="ml-auto flex items-center gap-3">{topbar}</div>
        </header>
        {open && (
          <div className="border-b border-border bg-card md:hidden">{navList}</div>
        )}
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
