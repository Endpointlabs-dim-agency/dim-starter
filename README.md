# Your app

A **Next.js (App Router) + TypeScript + Tailwind CSS** application, built and
maintained with [EndpointLabs](https://endpointlabs.io). This is a standard,
self-contained codebase — any developer can pick it up and work on it.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in what your app uses (see below)
npm run dev
```

## How this codebase is organized

- `app/` — pages and server actions (Next.js App Router).
- `components/ui/` — vendored shadcn/ui primitives; `components/blocks/` —
  ready-made page sections the app is composed from.
- `lib/` — small typed helpers: `db.ts` (Postgres), `email.ts`
  (transactional email), `ai.ts` (AI features), `stripe.ts` (payments).
- `migrations/` — plain SQL, applied in order on every deploy
  (`scripts/migrate.mjs` runs before `next build`; idempotent, tracked in a
  `_migrations` table). Never edit an applied migration — add a new
  numbered file.
- `CLAUDE.md` — the app's design system and conventions. It's written for
  the AI builder that maintains this app, and it's equally useful reading
  for a human developer.

## Environment

While the app is hosted on EndpointLabs, everything below is provisioned
and injected automatically — there is nothing to set up.

| Var | Use |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Postgres (runtime / migrations) |
| `ENDPOINTLABS_AI_KEY` | AI features + transactional email via the platform gateways |
| `BLOB_READ_WRITE_TOKEN` | file uploads |
| `STRIPE_SECRET_KEY` | payments (you add your own key) |

Self-hosting instead? Point `DATABASE_URL` at any Postgres and run the
migrations; AI and email route through EndpointLabs gateways, so replace
`lib/ai.ts` / `lib/email.ts` with your own providers (e.g. the Anthropic
and Resend SDKs) — each file is a few lines and documents its contract.

No secrets are ever committed to this repository — configuration lives in
environment variables only.
