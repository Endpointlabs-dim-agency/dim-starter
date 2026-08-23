import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { hasDb } from "@/lib/db";
import { getSettings, insertLead, markEscalated } from "@/lib/assistant/store";

export const runtime = "nodejs";

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(2000),
  sourcePage: z.string().trim().max(300).optional(),
  visitorKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please fill in your name, a valid email, and a message." },
      { status: 400 },
    );
  if (!hasDb())
    return NextResponse.json(
      { error: "Messages can't be saved right now — please try again soon." },
      { status: 503 },
    );
  const settings = await getSettings();
  if (!settings.captureEnabled)
    return NextResponse.json(
      { error: "The contact form is switched off right now." },
      { status: 403 },
    );

  const lead = parsed.data;
  await insertLead({
    name: lead.name,
    email: lead.email,
    message: lead.message,
    sourcePage: lead.sourcePage ?? null,
  });

  if (lead.visitorKey) {
    try {
      await markEscalated(lead.visitorKey);
    } catch {
      // The lead row is the source of truth — escalation flag is best-effort.
    }
  }

  // Owner notification is best-effort: the saved lead is what matters.
  try {
    if (settings.notifyEmail) {
      await sendEmail({
        to: settings.notifyEmail,
        subject: `New message from your site assistant — ${lead.name}`,
        replyTo: lead.email,
        text: [
          `Someone left a message through the site assistant on your site.`,
          ``,
          `Name: ${lead.name}`,
          `Email: ${lead.email}`,
          ``,
          `Message:`,
          lead.message,
          ``,
          `Reply to this email to reach them directly.`,
        ].join("\n"),
      });
    }
  } catch {
    // Never fail the submission over a notification email.
  }

  return NextResponse.json({ ok: true });
}
