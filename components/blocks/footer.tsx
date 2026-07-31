import Link from "next/link";

export interface FooterProps {
  brand: React.ReactNode;
  tagline?: string;
  columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  finePrint?: string;
}

export function Footer({ brand, tagline, columns = [], finePrint }: FooterProps) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <p className="font-display text-lg font-semibold">{brand}</p>
            {tagline && <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>}
          </div>
          {columns.length > 0 && (
            <div className="flex flex-wrap gap-12">
              {columns.map((c) => (
                <div key={c.title}>
                  <p className="text-sm font-medium">{c.title}</p>
                  <ul className="mt-3 space-y-2">
                    {c.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        {finePrint && (
          <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
            {finePrint}
          </p>
        )}
      </div>
    </footer>
  );
}
