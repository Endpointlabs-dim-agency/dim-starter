import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqProps {
  title?: React.ReactNode;
  subtitle?: string;
  items: Array<{ question: string; answer: string }>;
}

export function Faq({ title = "Frequently asked questions", subtitle, items }: FaqProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
      <Accordion type="single" collapsible className="mt-8">
        {items.map((f, i) => (
          <AccordionItem key={f.question} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
