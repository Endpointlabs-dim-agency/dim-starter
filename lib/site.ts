import type { Metadata } from "next";
import site from "./site.json";

// Search + AI visibility, in one place. `lib/site.json` holds the site's
// public identity and the facts behind its schema.org markup; the platform
// writes it at first build and the agent keeps it true to what the owner
// supplied (never invent a phone, address, hours or prices).
//
// Two env vars are PLATFORM-MANAGED (set on the Vercel project, never by
// hand or in code):
//   NEXT_PUBLIC_SITE_URL — the site's public origin (custom domain once
//     connected, else <name>.endpointlabs.app). Drives canonicals, the
//     sitemap, robots.txt and absolute Open Graph URLs.
//   SITE_INDEXABLE — "1" once the owner publishes. Until then every
//     response carries `X-Robots-Tag: noindex` (next.config.mjs) and pages
//     render robots noindex, so drafts and placeholders never reach an index.

export type SiteConfig = typeof site & { schemaType: string | null; title?: string };
export const SITE = site as SiteConfig;

// `name` is the business's own name (schema.org, link-preview site name,
// title suffix); `title` is the homepage search title, which may add the
// city or a short descriptor. Empty title falls back to the name.
export function siteTitle(): string {
  return SITE.title?.trim() || SITE.name;
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE === "1";
}

// Root-layout metadata. Deliberately has NO canonical and NO og:url: those
// are inherited by every child page, so a root value would point every
// page at the homepage. Pages set them via pageMetadata().
export function siteMetadata(): Metadata {
  const indexable = isIndexable();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: siteTitle(), template: `%s · ${SITE.name}` },
    description: SITE.description,
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: siteTitle(),
      description: SITE.description,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: siteTitle(), description: SITE.description },
    // Only the draft state is declared: "index, follow" is the default, and
    // emitting it would conflict with the noindex that owner pages add.
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
  };
}

// Per-page metadata: export from every PUBLIC page.
//   export const metadata = pageMetadata({ title: "Menu", description: "…", path: "/menu" });
// Omit `title` on the homepage to use the site name as-is.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description?: string;
  path: string;
}): Metadata {
  const desc = description ?? SITE.description;
  const ogTitle = title ? `${title} · ${SITE.name}` : siteTitle();
  // A page-level openGraph object replaces the root one, so the default
  // preview image (app/opengraph-image.tsx) is re-attached here. A route's
  // own opengraph-image file still takes precedence.
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: SITE.name };
  return {
    ...(title ? { title } : {}),
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: ogTitle,
      description: desc,
      url: path,
      locale: "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: desc, images: [image.url] },
  };
}
