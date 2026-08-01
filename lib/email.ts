// Transactional email door for this app. Calls the EndpointLabs email
// gateway with this app's identity key (ENDPOINTLABS_AI_KEY — injected by the
// platform, server-only; the same key lib/ai.ts uses). The sender address is
// fixed by the platform (this app's own @mail.endpointlabs.app address) —
// there is nothing to configure and no key to ask for.
// SERVER-SIDE ONLY: use from server actions and route handlers; never import
// in a client component and never expose the key to the browser.

const GATEWAY_URL =
  process.env.ENDPOINTLABS_EMAIL_URL ??
  "https://app.endpointlabs.io/api/email-gateway/send";

export interface SendEmailOptions {
  // Up to 5 recipients per send.
  to: string | string[];
  subject: string;
  // Provide html, text, or both.
  html?: string;
  text?: string;
  // Where replies should go (e.g. the business owner's real address).
  replyTo?: string;
}

// Sends one transactional email. Returns the provider message id.
// Throws with a friendly message on failure — catch it and tell the user
// (e.g. "your booking is saved, but the confirmation email didn't send").
export async function sendEmail(
  opts: SendEmailOptions,
): Promise<{ id: string | null }> {
  const key = process.env.ENDPOINTLABS_AI_KEY;
  if (!key)
    throw new Error(
      "Email is unavailable in this environment (app key not set).",
    );
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    id?: string | null;
    error?: string;
  } | null;
  if (!res.ok)
    throw new Error(json?.error ?? `Email failed to send (${res.status}).`);
  return { id: json?.id ?? null };
}
