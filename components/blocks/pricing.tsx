import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PricingProps {
  title?: React.ReactNode;
  subtitle?: string;
  tiers: Array<{
    name: string;
    price: string;
    period?: string;
    description?: string;
    features: string[];
    cta: { label: string; href: string };
    highlighted?: boolean;
  }>;
}

export function Pricing({ title, subtitle, tiers }: PricingProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      {(title || subtitle) && (
        <div className="mb-10 max-w-2xl">
          {title && (
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          )}
          {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t) => (
          <Card
            key={t.name}
            className={cn("relative border-border", t.highlighted && "border-primary shadow-sm")}
          >
            {t.highlighted && (
              <Badge className="absolute -top-2.5 left-6">Most popular</Badge>
            )}
            <CardContent className="flex h-full flex-col p-6">
              <h3 className="font-medium">{t.name}</h3>
              <p className="mt-3">
                <span className="font-display text-4xl font-semibold">{t.price}</span>
                {t.period && <span className="text-sm text-muted-foreground"> {t.period}</span>}
              </p>
              {t.description && (
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={t.highlighted ? "default" : "outline"}>
                <Link href={t.cta.href}>{t.cta.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
