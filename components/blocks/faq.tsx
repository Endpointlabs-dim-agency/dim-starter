import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLd } from "@/components/site-json-ld";

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
      {/* FAQPage markup mirrors the visible Q&A exactly (required by search
          guidelines). Helps AI assistants quote answers; Google shows FAQ
          rich results only for government/health sites. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
    </section>
  );
}
