import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Owner access for this app. OWNER_PASSCODE is injected by the platform
// (preview and production); the business owner reads it from the Keys panel
// in their EndpointLabs workspace. The session cookie stores an HMAC derived
// from the passcode, so rotating the passcode signs every device out.
//
// Fail-closed: when OWNER_PASSCODE is unset, nothing is ever treated as the
// owner — a page behind <OwnerGate> shows the passcode screen, never data.

const OWNER_COOKIE = "el_owner";

export function ownerSessionToken(passcode: string): string {
  return createHmac("sha256", passcode).update("owner-session-v1").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isOwner(): Promise<boolean> {
  const passcode = process.env.OWNER_PASSCODE;
  if (!passcode) return false;
  const value = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, ownerSessionToken(passcode));
}

// For server actions and route handlers that read or export collected data:
// call first and stop when it throws (actions) or check isOwner() and return
// a 401 Response (route handlers).
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Owner access required");
  }
}

export { OWNER_COOKIE };
