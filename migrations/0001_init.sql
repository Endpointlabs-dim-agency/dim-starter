-- Initial schema for the client app. Add new migrations as numbered files
-- (0002_*.sql, 0003_*.sql, ...); they run in order on every deploy.

-- pgcrypto up front so gen_random_bytes/crypt/digest/hmac are available to
-- later migrations. gen_random_uuid() below is core Postgres and needs no
-- extension, while gen_random_bytes() needs this one — they read as
-- interchangeable and are not, and that confusion failed every build of a
-- real customer's app (2026-08-17). Migrations run before the compile, so a
-- missing function takes the whole deploy down.
create extension if not exists pgcrypto;

-- Example table. Replace/extend as the project needs.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_at timestamptz not null default now()
);

-- File uploads use Vercel Blob (see CLAUDE.md "File uploads") — no storage
-- tables are needed here. This migration must stay plain Postgres: it runs
-- against Neon, which has no Supabase-specific schemas.
