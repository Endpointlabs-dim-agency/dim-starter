import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// PLATFORM-MANAGED — do not edit. Served at /robots.txt.
// All crawlers (search engines and AI assistants alike) may crawl every
// page. Drafts are kept out of indexes with a noindex header, NOT with a
// Disallow here: a crawler that is disallowed never fetches the page, so it
// never sees the noindex and can still index the bare URL from links.
// Owner pages are protected by <OwnerGate> (real auth) and carry noindex.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
