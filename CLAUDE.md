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
  `chart-1..5`, radius via `rounded-lg` etc.). Fonts: `font-sans` (Inter),
  `font-mono` (JetBrains Mono) — already loaded in `app/layout.tsx`.
- **Dark mode**: add/remove the `dark` class on `<html>`; tokens flip
  automatically. Restyle by adjusting the CSS variables in `globals.css`
  (`:root` and `.dark`), not by scattering raw colors.
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

## Auth

Only when the app truly needs login. If the database was provisioned with
`needsAuth`, auth env vars are injected alongside `DATABASE_URL` — check
`.env.local` for which provider (Neon Auth vars or the Supabase trio) and
follow that provider's standard Next.js integration. Email/password and
magic links only — never add third-party OAuth providers (they need
credentials the platform doesn't hold).

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
