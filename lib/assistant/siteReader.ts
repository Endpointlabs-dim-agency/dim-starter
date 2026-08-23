// The assistant's ground truth: the site's own PUBLIC pages, read from the
// app itself and stripped to plain text. This is why the assistant knows the
// site from day one and never goes stale — whatever the pages say right now
// is what it answers from. Owner-gated pages and APIs are never read, so
// visitor-submitted data (leads, conversations) can never leak into answers.

const CACHE_TTL_MS = 5 * 60_000;
const MAX_PAGES = 5;
const MAX_TOTAL_CHARS = 4_000;
const FETCH_TIMEOUT_MS = 4_000;

let cache: { at: number; origin: string; text: string } | null = null;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function publicPaths(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const path = m[1];
    if (path === "/") continue;
    if (path.startsWith("/api/") || path.startsWith("/owner")) continue;
    if (/\.(png|jpe?g|webp|svg|ico|css|js|woff2?|txt|xml)$/i.test(path)) continue;
    out.add(path);
    if (out.size >= MAX_PAGES - 1) break;
  }
  return [...out];
}

async function fetchPage(origin: string, path: string): Promise<string> {
  const res = await fetch(`${origin}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "x-assistant-reader": "1" },
  });
  if (!res.ok) return "";
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return "";
  return await res.text();
}

// Plain text of the site's public pages (home first), capped and cached.
// Returns "" on any failure — the assistant still answers from SITE_FACTS
// and the owner's notes.
export async function getSiteText(origin: string): Promise<string> {
  if (cache && cache.origin === origin && Date.now() - cache.at < CACHE_TTL_MS)
    return cache.text;
  try {
    const homeHtml = await fetchPage(origin, "/");
    if (!homeHtml) return cache?.text ?? "";
    const sections: string[] = [`[Home]\n${stripHtml(homeHtml)}`];
    let total = sections[0].length;
    for (const path of publicPaths(homeHtml)) {
      if (total >= MAX_TOTAL_CHARS) break;
      const html = await fetchPage(origin, path).catch(() => "");
      if (!html) continue;
      const text = stripHtml(html);
      if (!text) continue;
      const section = `[${path}]\n${text}`;
      sections.push(section);
      total += section.length;
    }
    const text = sections.join("\n\n").slice(0, MAX_TOTAL_CHARS);
    cache = { at: Date.now(), origin, text };
    return text;
  } catch {
    return cache?.text ?? "";
  }
}
