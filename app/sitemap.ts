import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { SITE, siteUrl } from "@/lib/site";

// Served at /sitemap.xml, generated at build time from the app/ directory:
// every static page route, minus API routes, owner pages, dynamic segments
// ([slug]) and any page that is owner-gated or opts out of indexing.
// Dynamic pages that should be listed (e.g. /menu/tacos) go in
// lib/site.json "sitemapPaths".
export const dynamic = "force-static";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const PRIVATE_MARKERS = ["OwnerGate", "requireOwner", "index: false", "noindex"];

function collect(dir: string, segments: string[], out: Set<string>) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const page = entries.find((e) => e.isFile() && PAGE_FILE.test(e.name));
  if (page) {
    const src = fs.readFileSync(path.join(dir, page.name), "utf8");
    if (!PRIVATE_MARKERS.some((m) => src.includes(m))) {
      out.add("/" + segments.filter(Boolean).join("/"));
    }
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    if (name === "api" || name === "owner") continue;
    if (name.startsWith("_") || name.startsWith("@") || name.startsWith("[")) continue;
    if (name.startsWith("(") && name.endsWith(")")) {
      collect(path.join(dir, name), segments, out); // route group: no URL segment
      continue;
    }
    collect(path.join(dir, name), [...segments, name], out);
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const routes = new Set<string>();
  collect(path.join(process.cwd(), "app"), [], routes);
  for (const p of SITE.sitemapPaths as string[]) {
    if (typeof p === "string" && p.startsWith("/")) routes.add(p);
  }
  return [...routes]
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .map((route) => ({ url: route === "/" ? `${base}/` : `${base}${route}` }));
}
