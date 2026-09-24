// What the site assistant can DO on this app — the second app-specific
// assistant file (knowledge.ts is what it knows). Each action becomes a tool
// the assistant may call mid-conversation: check availability, book an
// appointment, place an order, join a waitlist, and for the owner, look up
// or change what visitors submitted.
//
// AGENTS: when this app has a real flow (bookings, orders, signups,
// reservations, requests), give the assistant an action for it here, backed
// by the SAME tables and lib/ modules the pages use. Rules:
// - scope "visitor" runs for anyone; scope "owner" runs ONLY when the owner
//   is unlocked (the el_owner cookie) — reading or changing submitted data is
//   always owner scope.
// - confirm: true on anything that creates, changes, cancels, or sends. The
//   platform will not run it until the visitor taps Confirm on the summary
//   `summarize` returns — write that summary as one plain sentence saying
//   exactly what will happen.
// - Validate input yourself (dates, required fields); return plain JSON the
//   assistant can read back (e.g. { ok: true, when: "Sat 2:00 pm" } or
//   { ok: false, reason: "That slot was just taken" }). Throwing is fine —
//   the assistant is told the action failed.
// - Never invent data in a result; read it from the database or the app's
//   own modules. Never import from a "use client" component file.

export type ActionScope = "visitor" | "owner";

export interface ActionContext {
  scope: ActionScope;
  visitorKey: string;
  confirmed: boolean;
}

export interface AssistantAction {
  name: string;
  description: string;
  scope: ActionScope;
  // JSON Schema for the action's input (type: "object").
  input: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  confirm?: boolean;
  summarize?: (input: Record<string, unknown>) => string;
  run: (input: Record<string, unknown>, ctx: ActionContext) => Promise<unknown>;
}

// Starts empty on a brand-new app. Example shape for a bookings app:
//
// {
//   name: "check_availability",
//   description: "List open appointment times for a date (YYYY-MM-DD).",
//   scope: "visitor",
//   input: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
//   run: async ({ date }) => ({ open: await openSlots(String(date)) }),
// },
// {
//   name: "book_appointment",
//   description: "Book an open time for the visitor. Ask for their name first.",
//   scope: "visitor",
//   confirm: true,
//   input: { type: "object", properties: { date: { type: "string" }, time: { type: "string" }, name: { type: "string" } }, required: ["date", "time", "name"] },
//   summarize: (i) => `Book a ${i.service ?? "appointment"} for ${i.name} on ${i.date} at ${i.time}.`,
//   run: async (i) => createBooking(i),
// },
export const ACTIONS: AssistantAction[] = [];
