import { NextRequest, NextResponse } from "next/server";
import { OWNER_COOKIE, ownerSessionToken, safeEqual } from "@/lib/owner-auth";

// Silent owner unlock for the EndpointLabs workspace preview. The workspace
// user has already proven they own this app (their workspace login gates the
// engagement), so showing them the passcode wall inside their own preview is
// pure friction — and because the preview may frame a different hostname
// after every change (per-deployment addresses), a cookie alone cannot carry
// the unlock across. The workspace wraps the preview URL through this route
// with the session token it derives from the same passcode; the cookie is
// set first-party here and the request continues to the app.
//
// The token IS the cookie value (an HMAC of the passcode — never the
// passcode itself), shown only inside the owner's own browser. Anyone who
// has it could unlock this app's owner view, exactly like the cookie it
// becomes; rotating the passcode invalidates both.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "/";
  // Same-origin relative paths only — never an open redirect.
  const dest = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  const passcode = process.env.OWNER_PASSCODE;
  if (!passcode || !token)
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!safeEqual(token, ownerSessionToken(passcode)))
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  // Relative Location on purpose: an absolute URL built from req.url points
  // at the server's own bind address behind a proxy (the live-preview dev
  // server sees 0.0.0.0:3000), which sent the browser to a dead origin. The
  // browser resolves a relative redirect against the host it is already on,
  // which is correct on every host this app serves from.
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: dest },
  });
  res.cookies.set(OWNER_COOKIE, ownerSessionToken(passcode), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
