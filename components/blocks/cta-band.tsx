import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CtaBandProps {
  title: React.ReactNode;
  subtitle?: string;
  cta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function CtaBand({ title, subtitle, cta, secondaryCta }: CtaBandProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-lg opacity-85">{subtitle}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link href={cta.href}>
              {cta.label}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          {secondaryCta && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
