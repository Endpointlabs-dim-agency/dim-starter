import { SITE, siteUrl } from "@/lib/site";

// schema.org JSON-LD for the site and the business behind it, built only
// from lib/site.json (owner-supplied facts). Empty fields are omitted —
// never fill them with guesses. No Review/AggregateRating here on purpose:
// a business marking up reviews of itself is not eligible for review stars
// and can be treated as spam. PLATFORM-MANAGED — keep in app/layout.tsx.

type Json = Record<string, unknown>;

function compact(obj: Json): Json {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as Json).length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped so content can't close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function SiteJsonLd() {
  const url = siteUrl();
  const graph: Json[] = [
    compact({ "@type": "WebSite", "@id": `${url}/#website`, url: `${url}/`, name: SITE.name, description: SITE.description }),
  ];
  if (SITE.schemaType) {
    const a = SITE.address;
    const address =
      a.street || a.city
        ? compact({
            "@type": "PostalAddress",
            streetAddress: a.street,
            addressLocality: a.city,
            addressRegion: a.region,
            postalCode: a.postalCode,
            addressCountry: a.country,
          })
        : undefined;
    graph.push(
      compact({
        "@type": SITE.schemaType,
        "@id": `${url}/#business`,
        name: SITE.name,
        description: SITE.description,
        url: `${url}/`,
        image: `${url}/opengraph-image`,
        telephone: SITE.phone,
        email: SITE.email,
        address,
        areaServed: SITE.areaServed,
        openingHours: SITE.openingHours,
        priceRange: SITE.priceRange,
        sameAs: SITE.sameAs,
      }),
    );
  }
  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
