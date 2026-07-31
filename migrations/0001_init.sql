-- Initial schema for the client app. Add new migrations as numbered files
-- (0002_*.sql, 0003_*.sql, ...); they run in order on every deploy.

-- Example table. Replace/extend as the project needs.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_at timestamptz not null default now()
);

-- File uploads use Vercel Blob (see CLAUDE.md "File uploads") — no storage
-- tables are needed here. This migration must stay plain Postgres: it runs
-- against Neon, which has no Supabase-specific schemas.
