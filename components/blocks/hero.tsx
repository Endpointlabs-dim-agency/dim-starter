import Image from "next/image";
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
  /**
   * Full-bleed photo behind the copy. The hero adds its own dark overlay and
   * switches every piece of copy to light text, so the headline always reads.
   * Use this for any photo behind the headline — never hand-roll one with
   * absolute positioning or -z-10. `media` is ignored when this is set.
   */
  backgroundImage?: { src: string; alt: string };
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
  backgroundImage,
}: HeroProps) {
  const photo = Boolean(backgroundImage);
  const sideMedia = photo ? undefined : media;
  const centered = align === "center" && !sideMedia;
  const content = (
    <div
      className={cn(
        sideMedia && "grid items-center gap-12 lg:grid-cols-2",
        centered && "mx-auto max-w-3xl text-center",
        photo && !centered && "max-w-2xl",
      )}
    >
      <div>
        {badge && (
          <Badge
            variant="secondary"
            className={cn(
              "mb-5",
              photo && "border-white/30 bg-white/15 text-white backdrop-blur-sm",
            )}
          >
            {badge}
          </Badge>
        )}
        <h1
          className={cn(
            "font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl",
            photo && "text-white [text-shadow:0_2px_16px_rgb(0_0_0/0.35)]",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-5 max-w-xl text-lg leading-relaxed",
              photo ? "text-white/85" : "text-muted-foreground",
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
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn(
                  photo &&
                    "border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white",
                )}
              >
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
                <dd className={cn("font-display text-2xl font-semibold", photo && "text-white")}>
                  {s.value}
                </dd>
                <dd className={cn("text-sm", photo ? "text-white/75" : "text-muted-foreground")}>
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {sideMedia && <div className="min-w-0">{sideMedia}</div>}
    </div>
  );

  if (!backgroundImage)
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        {content}
      </section>
    );

  // isolate: the photo and overlay sit at negative z-index, which would
  // otherwise paint behind the page background and vanish.
  return (
    <section
      data-hero="photo"
      className="relative isolate flex min-h-[80svh] items-center overflow-hidden"
    >
      <Image
        src={backgroundImage.src}
        alt={backgroundImage.alt}
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10",
          centered
            ? "bg-gradient-to-b from-black/70 via-black/55 to-black/75"
            : "bg-black/60 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/60 lg:to-black/25",
        )}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        {content}
      </div>
    </section>
  );
}
