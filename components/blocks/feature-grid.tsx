import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FeatureGridProps {
  eyebrow?: string;
  title?: React.ReactNode;
  subtitle?: string;
  features: Array<{ icon?: React.ReactNode; title: string; description: string }>;
  columns?: 2 | 3 | 4;
}

export function FeatureGrid({ eyebrow, title, subtitle, features, columns = 3 }: FeatureGridProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      {(eyebrow || title || subtitle) && (
        <div className="mb-10 max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
          )}
          {title && (
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          )}
          {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          columns === 3 && "lg:grid-cols-3",
          columns === 4 && "lg:grid-cols-4",
        )}
      >
        {features.map((f) => (
          <Card key={f.title} className="border-border">
            <CardContent className="p-6">
              {f.icon && (
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {f.icon}
                </div>
              )}
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
