import postgres from "postgres";

// Primary database door. DATABASE_URL is injected automatically when this
// project's database is provisioned — never hardcode connection strings.
// Usage (server components / actions / route handlers only):
//   import { db } from "@/lib/db";
//   const rows = await db()`select * from bookings order by created_at desc`;
// Returns null when no database is provisioned yet — guard call sites.

let client: ReturnType<typeof postgres> | null = null;

export function db(): ReturnType<typeof postgres> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "No database provisioned yet (DATABASE_URL is unset). Request one before using db().",
    );
  }
  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 5,
    });
  }
  return client;
}

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
