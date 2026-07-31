import { Card, CardContent } from "@/components/ui/card";

export interface FormSectionProps {
  title: string;
  description?: string;
  /** The fields (Label + Input/Select/Textarea pairs). */
  children: React.ReactNode;
  /** Save/cancel buttons, status text… */
  footer?: React.ReactNode;
}

/** Settings-style section: heading column beside a card of fields. */
export function FormSection({ title, description, children, footer }: FormSectionProps) {
  return (
    <section className="grid gap-4 py-6 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card className="border-border">
        <CardContent className="space-y-5 p-6">{children}</CardContent>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </Card>
    </section>
  );
}
