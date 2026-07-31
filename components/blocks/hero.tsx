import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeroProps {
  badge?: string;
  title: React.ReactNode;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  align?: "left" | "center";
  /** Optional visual (card, image-free art, stat panel…) shown beside the copy. */
  media?: React.ReactNode;
  stats?: Array<{ value: string; label: string }>;
}

export function Hero({
  badge,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  align = "left",
  media,
  stats,
}: HeroProps) {
  const centered = align === "center" && !media;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div
        className={cn(
          media && "grid items-center gap-12 lg:grid-cols-2",
          centered && "mx-auto max-w-3xl text-center",
        )}
      >
        <div>
          {badge && (
            <Badge variant="secondary" className="mb-5">
              {badge}
            </Badge>
          )}
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground",
                centered && "mx-auto",
              )}
            >
              {subtitle}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div
              className={cn(
                "mt-8 flex flex-wrap items-center gap-3",
                centered && "justify-center",
              )}
            >
              {primaryCta && (
                <Button asChild size="lg">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryCta && (
                <Button asChild size="lg" variant="outline">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              )}
            </div>
          )}
          {stats && stats.length > 0 && (
            <dl
              className={cn(
                "mt-10 flex flex-wrap gap-x-10 gap-y-5",
                centered && "justify-center",
              )}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-2xl font-semibold">{s.value}</dd>
                  <dd className="text-sm text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {media && <div className="min-w-0">{media}</div>}
      </div>
    </section>
  );
}
