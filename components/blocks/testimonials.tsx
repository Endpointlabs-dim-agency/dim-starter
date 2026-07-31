import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface TestimonialsProps {
  title?: React.ReactNode;
  items: Array<{ quote: string; name: string; role?: string }>;
}

export function Testimonials({ title, items }: TestimonialsProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      {title && (
        <h2 className="mb-10 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.name + t.quote.slice(0, 16)} className="border-border">
            <CardContent className="flex h-full flex-col p-6">
              <p className="flex-1 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-sm text-primary">
                    {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
