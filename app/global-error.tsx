"use client";

import { useEffect } from "react";

// Root-level branded error screen (renders when the whole app shell fails,
// replacing app/layout.tsx) — the counterpart to app/error.tsx. Without it,
// Next serves its builtin "Application error: a server-side exception has
// occurred while loading <host> (Digest: …)" page, which leaks
// infrastructure hostnames and reads as a crash to non-technical owners
// (2026-08-14). Must render its own <html>/<body>. DO NOT REMOVE.

const ALLOWED_PARENTS = [
  "https://app.endpointlabs.io",
  "http://localhost:3000",
];

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (window.parent === window) return;
    const report = () => {
      for (const origin of ALLOWED_PARENTS)
        window.parent.postMessage({ type: "epl-app-error" }, origin);
    };
    report();
    const iv = setInterval(report, 2500);
    return () => clearInterval(iv);
  }, []);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#171717" }}>
            Something went wrong loading this page.
          </p>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#737373",
              lineHeight: 1.6,
            }}
          >
            It&apos;s usually temporary. If changes are being made to the site
            right now, it recovers on its own in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #e5e5e5",
              background: "#fff",
              color: "#171717",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
