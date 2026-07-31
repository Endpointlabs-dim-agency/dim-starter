"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ContactBlockProps {
  title?: React.ReactNode;
  subtitle?: string;
  /** Address lines, phone, hours — rendered beside the form. */
  details?: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  /** Called with the submission; defaults to a thank-you toast. */
  onSubmit?: (data: { name: string; email: string; message: string }) => void | Promise<void>;
  submitLabel?: string;
}

export function ContactBlock({
  title = "Get in touch",
  subtitle,
  details = [],
  onSubmit,
  submitLabel = "Send message",
}: ContactBlockProps) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
          {details.length > 0 && (
            <dl className="mt-8 space-y-4">
              {details.map((d) => (
                <div key={d.label} className="flex items-start gap-3">
                  {d.icon && (
                    <span className="mt-0.5 text-primary [&>svg]:h-4 [&>svg]:w-4">{d.icon}</span>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">{d.label}</dt>
                    <dd className="text-sm font-medium">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>
        <Card className="border-border">
          <CardContent className="p-6">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  if (onSubmit) await onSubmit(form);
                  else toast.success("Thanks — we'll get back to you shortly.");
                  setForm({ name: "", email: "", message: "" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-name">Name</Label>
                  <Input
                    id="cb-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-email">Email</Label>
                  <Input
                    id="cb-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-message">Message</Label>
                <Textarea
                  id="cb-message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {busy ? "Sending…" : submitLabel}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
