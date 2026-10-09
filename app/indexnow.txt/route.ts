// PLATFORM-MANAGED — do not edit. Serves the IndexNow key so the platform
// can tell Bing and other IndexNow engines about new pages the moment the
// owner publishes (https://www.indexnow.org). INDEXNOW_KEY is set on the
// Vercel project by the platform; without it this route is a 404.
export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
