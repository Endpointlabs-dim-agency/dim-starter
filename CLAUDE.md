# App conventions — read before building

This is a Next.js App Router + TypeScript + Tailwind CSS v4 app for a real
business owner. The stack is FIXED: never add another framework, UI library,
CSS approach, or state manager.

## Design system (use it — never hand-roll what exists here)

- **Components**: shadcn/ui is vendored in `components/ui/`:
  accordion, avatar, badge, button, card, checkbox, dialog, dropdown-menu,
  form, input, label, select, separator, sheet, skeleton, sonner (toasts),
  switch, table, tabs, textarea, tooltip. Import like
  `import { Button } from "@/components/ui/button"`.
- **Icons**: `lucide-react`.
- **Tokens**: semantic Tailwind colors are wired in `app/globals.css`
  (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`,
  `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`,
  `chart-1..5`, radius via `rounded-lg` etc.). Fonts: `font-sans` (body),
  `font-display` (headings), `font-mono` — already loaded in `app/layout.tsx`.
- **Themes**: `<html data-theme="…">` selects a full preset (colors, radius,
  fonts) from `globals.css`: `engineered` (neutral, precise) · `editorial`
  (cream + serif, restaurants/studios) · `warm` (terracotta, hospitality/
  wellness) · `bold` (dark + electric, fitness/nightlife/tech) · `minimal`
  (stark black-on-white, fashion/architecture) · `organic` (sage + rounded,
  garden/outdoors/sustainable). Pick the one that fits the business; restyle
  further by adjusting tokens, not by scattering raw colors. Dark mode: the
  `dark` class on `<html>` still works with the default theme.
- **Section blocks — compose from these FIRST** (`components/blocks/`, all
  exported from `@/components/blocks`). They are token-driven, responsive,
  and follow every theme automatically. Write real copy into their props;
  hand-roll custom sections only when a concept genuinely doesn't fit.
  - Marketing/front door: `Navbar` (brand, links, cta) · `Hero` (badge,
    title, subtitle, ctas, align, media?, stats?) · `FeatureGrid` (features
    w/ lucide icons, 2-4 cols) · `Testimonials` (quote/name/role) ·
    `Pricing` (tiers, highlighted) · `MenuList` (menu/service/price lists
    with sections) · `Faq` (accordion) · `CtaBand` (closing call-to-action)
    · `ContactBlock` (working form + business details) · `Footer`.
  - **Business app chrome (dashboards, CRMs, portals, trackers, admin
    tools — our specialty):** `AppShell` (sidebar nav + topbar; wrap app
    pages in it) · `PageHeader` (title/description/actions) · `StatCards`
    (KPI row w/ deltas) · `DataTable` (typed columns, built-in search,
    empty message, row click, toolbar slot) · `FormSection` (settings-style
    field groups) · `EmptyState`. First builds have no database — power
    tables/forms with useState + realistic seed data so the app feels alive;
    wire persistence when a database is provisioned.
- **Bar**: 2026-quality design — strong typographic hierarchy, generous
  whitespace, ONE accent used with restraint, subtle borders over heavy
  shadows, fully responsive, real copy for the business (never lorem ipsum).
- Forms: `react-hook-form` + `zod` + the `form.tsx` primitives are available.

## Database — when and how

**Decide semantically whether this app needs durable storage:**
- NO database: landing pages, portfolios, calculators, static catalogs,
  client-side-only tools, contact forms that only send email. Use React
  state / localStorage.
- YES database: accounts or login, users saving/editing data, shared or
  multi-user state, submission inboxes, bookings/orders, admin dashboards
  over records.

**If yes and `DATABASE_URL` is not set yet** (check `.env.local`): call the
`request_database` tool ONCE (pass `needsAuth: true` if the app needs
login), then keep building — write your migrations and code as if the
database exists; it connects automatically and migrations are applied when
provisioning completes (usually seconds).

**Workflow:**
1. Schema changes ONLY via migrations: add `migrations/NNNN_name.sql`
   (next number in sequence). Never mutate schema ad hoc.
2. If `DATABASE_URL` is already set, run `npm run migrate` after adding a
   migration (idempotent; reads `.env.local`).
3. Query from server code via `import { db, hasDb } from "@/lib/db"` —
   `` await db()`select ...` `` (the `postgres` library's tagged templates).
   Server components, server actions, and route handlers only.
4. Destructive changes (dropping tables/columns, incompatible type changes)
   need explicit user confirmation first.

`lib/supabase/*` exists for projects provisioned with Supabase (env vars
`NEXT_PUBLIC_SUPABASE_URL` etc.). Use it only when those vars are present.

## Auth (Neon Auth — @neondatabase/auth, preinstalled)

Only when the app truly needs login. If the database was provisioned with
`needsAuth`, these env vars appear in `.env.local`: `NEON_AUTH_BASE_URL`,
`NEON_AUTH_COOKIE_SECRET` (plus `NEON_AUTH_JWKS_URL`). Recipe:

1. `lib/auth/server.ts`:
   ```ts
   import { createNeonAuth } from "@neondatabase/auth/next/server";
   export const auth = createNeonAuth({
     baseUrl: process.env.NEON_AUTH_BASE_URL!,
     cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
   });
   ```
2. `app/api/auth/[...path]/route.ts`:
   ```ts
   import { auth } from "@/lib/auth/server";
   export const { GET, POST } = auth.handler();
   ```
3. Sign up / sign in / session / sign out via the same SDK's client and
   server helpers (email + password). Read the current user server-side
   through `auth` in server components/actions; gate private pages on it.
4. User records live in the database's `neon_auth` schema (`users_sync`
   table) — reference them from your own tables by user id; do NOT create
   your own users/passwords tables.

If the env vars are missing but the app needs login, call
`request_database` with `needsAuth: true` (works even when the database
already exists). Email/password only — never add third-party OAuth
providers (they need credentials the platform doesn't hold). If the
Supabase trio is present instead, use Supabase Auth per its standard
Next.js integration.

## AI features (keyless — use lib/ai.ts)

This app can use AI with NO API key setup: `lib/ai.ts` calls the
EndpointLabs gateway using `ENDPOINTLABS_AI_KEY` (already injected by the
platform in both preview and production).

- `await ai("prompt")` or `await ai(messages, { system, model })` → text.
  Models: `"fast"` (default — use it unless reasoning is genuinely hard)
  or `"smart"`.
- `aiStream(...)` returns the raw SSE Response (Anthropic Messages
  streaming format) for chat UIs — pipe it through a route handler.
- SERVER-SIDE ONLY (server actions / route handlers). Never import in a
  client component; never send the key to the browser.
- Requests are capped per day per app — handle errors with a friendly
  message rather than retrying in a loop.
- Never ask the user for an Anthropic/OpenAI key and never install AI SDKs
  — the helper is the whole integration.

## File uploads

No object storage is wired by default. If the user asks for uploads, prefer
Vercel Blob if `BLOB_READ_WRITE_TOKEN` is present; otherwise build the flow
with a clear "storage connects when published" placeholder and say so in
the UI copy.

## Hard rules

- No payment processors or credentialed external services — build the flow
  without live processing (e.g. "pay in person") so the user can upgrade later.
- Never invent, hardcode, or placeholder secrets.
- Verify with `npx tsc --noEmit` once at the end. No `npm run build`, no
  `npm install` unless you added a dependency.
- No README/docs/tests unless asked. Commit your work when done.
- Never remove `<PreviewBridge />` or its import from `app/layout.tsx` —
  it powers click-to-edit in the builder preview and is compiled out of
  production builds.
- Never remove or restyle `<MadeWithBadge />` in `app/layout.tsx` — the
  platform controls it per plan (env flag), not per site.
