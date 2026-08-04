"use server";

import { cookies } from "next/headers";
import { OWNER_COOKIE, ownerSessionToken, safeEqual } from "@/lib/owner-auth";

export interface OwnerAuthState {
  error?: string;
  ok?: boolean;
}

export async function verifyOwnerPasscode(
  _prev: OwnerAuthState,
  formData: FormData,
): Promise<OwnerAuthState> {
  const passcode = process.env.OWNER_PASSCODE;
  if (!passcode) {
    return {
      error:
        "Owner access isn't configured for this app yet — open your EndpointLabs workspace and check the Keys panel.",
    };
  }
  const attempt = String(formData.get("passcode") ?? "").trim();
  if (!attempt || !safeEqual(attempt.toUpperCase(), passcode.toUpperCase())) {
    // Constant small delay keeps guessing slow without any infrastructure.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That passcode isn't right — check the Keys panel in your workspace." };
  }
  (await cookies()).set(OWNER_COOKIE, ownerSessionToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return { ok: true };
}

export async function ownerSignOut(): Promise<void> {
  (await cookies()).delete(OWNER_COOKIE);
}
