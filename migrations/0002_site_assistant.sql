-- Site assistant: leads, conversations, and owner-configurable settings.
-- No seed row on purpose: with no row the app treats the assistant as OFF
-- (lib/assistant/store.ts DEFAULT_SETTINGS) — it stays invisible until the
-- owner turns it on, which creates the row.
create table if not exists assistant_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  source_page text,
  status text not null default 'new'
);
create table if not exists assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  visitor_key text not null,
  transcript jsonb not null default '[]'::jsonb,
  escalated boolean not null default false
);
create table if not exists assistant_settings (
  id integer primary key default 1,
  notify_email text,
  enabled boolean not null default true,
  assistant_name text,
  welcome_message text,
  quick_prompts jsonb,
  tone text not null default 'friendly',
  custom_instructions text,
  extra_knowledge text,
  form_intro text,
  capture_enabled boolean not null default true
);
