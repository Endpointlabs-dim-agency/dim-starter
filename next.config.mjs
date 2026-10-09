/** @type {import('next').NextConfig} */

// Search/AI indexing is opt-in per deployment: the platform sets
// SITE_INDEXABLE=1 when the owner publishes. Until then (drafts, the
// builder's live preview, placeholder pages) every response is noindex.
// Owner pages and API routes are noindex always. PLATFORM-MANAGED — do not
// edit; see lib/site.ts.
const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig = {
  // The builder's live preview runs `next dev` — the dev-tools indicator
  // ("N · 1 Issue") is developer noise a business owner shouldn't see.
  devIndicators: false,
  async headers() {
    const rules = [
      { source: "/owner/:path*", headers: NOINDEX },
      { source: "/api/:path*", headers: NOINDEX },
    ];
    if (process.env.SITE_INDEXABLE !== "1") {
      rules.unshift({ source: "/:path*", headers: NOINDEX });
    }
    return rules;
  },
};

export default nextConfig;
