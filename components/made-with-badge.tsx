// "Made with EndpointLabs" badge — shown on free-plan apps, removed on paid
// plans by setting NEXT_PUBLIC_ENDPOINTLABS_BADGE=off on the app's Vercel
// project (the platform manages this; it is not a per-site style choice).
// Inline styles on purpose: the badge must look identical across every
// theme and survive any global CSS the app adds. DO NOT REMOVE from
// app/layout.tsx and do not restyle.

export function MadeWithBadge() {
  if (process.env.NEXT_PUBLIC_ENDPOINTLABS_BADGE === "off") return null;
  return (
    <a
      href="https://endpointlabs.io?utm_source=made-with-badge"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 2147482000,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 6,
        background: "rgba(10, 11, 12, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        color: "#e7e9ea",
        font: "500 11.5px/1 system-ui, -apple-system, sans-serif",
        letterSpacing: "0.01em",
        textDecoration: "none",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          background: "#6FE7D4",
          display: "inline-block",
        }}
      />
      Made with EndpointLabs
    </a>
  );
}
