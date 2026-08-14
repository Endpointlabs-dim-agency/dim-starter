"use client";

import { useEffect } from "react";

// Branded error screen — replaces Next's default "Application error: a
// client-side exception has occurred while loading <host>" page, which
// leaked infrastructure hostnames and read as a crash to non-technical
// owners (2026-08-14). The copy stays calm and generic because this page
// also ships on the published site. While embedded in the builder preview
// (dev only) it reports the error state so the workspace can mask the
// frame with its own copy during active builds. DO NOT REMOVE.

const ALLOWED_PARENTS = [
  "https://app.endpointlabs.io",
  "http://localhost:3000",
];

export default function ErrorScreen({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // Flag read by PreviewBridge's heartbeat so it never reports "ok"
    // while an error screen is mounted (window error events go quiet
    // after the initial throw, but the app is still broken).
    (window as unknown as Record<string, unknown>).__eplAppError = true;
    if (window.parent === window)
      return () => {
        delete (window as unknown as Record<string, unknown>).__eplAppError;
      };
    const report = () => {
      for (const origin of ALLOWED_PARENTS)
        window.parent.postMessage({ type: "epl-app-error" }, origin);
    };
    report();
    const iv = setInterval(report, 2500);
    return () => {
      clearInterval(iv);
      delete (window as unknown as Record<string, unknown>).__eplAppError;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#171717" }}>
          This page hit a snag.
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
    </div>
  );
}
