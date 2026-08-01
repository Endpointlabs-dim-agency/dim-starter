// Stripe door for this app — payments run on the OWNER'S OWN Stripe account.
// The key (STRIPE_SECRET_KEY) is added by the owner through the builder's
// Keys panel; it is injected as env in preview and production. NEVER ask for
// a key in chat, never hardcode one, never commit one.
// SERVER-SIDE ONLY: server actions and route handlers.

import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Throws when the key isn't set — call stripeConfigured() first and render a
// friendly "Connect Stripe" state instead of letting this throw reach users.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new Error(
      "Stripe is not connected yet — add STRIPE_SECRET_KEY in the builder's Keys panel.",
    );
  if (!client) client = new Stripe(key);
  return client;
}
